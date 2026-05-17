const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const { getPool } = require("../config/database");
const { generateToken, setAuthCookie, clearAuthCookie } = require("../middleware/authMiddleware");

// In production, this client ID should come from .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const authController = {
    // Google OAuth Login
    async googleLogin(req, res) {
        const { googleToken } = req.body;
        if (!googleToken) {
            return res.status(400).json({ error: "Google token is required." });
        }

        try {
            const ticket = await client.verifyIdToken({
                idToken: googleToken,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            const email = payload['email'];
            const full_name = payload['name'] || email.split('@')[0];
            const google_id = payload['sub'];

            const pool = getPool();
            const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
            let user;

            if (users.length > 0) {
                user = users[0];
                // Link google_id if not linked
                if (!user.google_id) {
                    await pool.execute("UPDATE users SET google_id = ? WHERE id = ?", [google_id, user.id]);
                }
                await pool.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
            } else {
                // Create new user for this Google account
                const [result] = await pool.execute(
                    "INSERT INTO users (email, password_hash, full_name, google_id) VALUES (?, NULL, ?, ?)",
                    [email, full_name, google_id]
                );
                user = { id: result.insertId, email, role: "user", full_name };
            }

            const token = generateToken(user, true); // True for rememberMe since it's Google
            setAuthCookie(res, token, true);

            res.json({
                message: "Google Login successful",
                token,
                user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }
            });
        } catch (error) {
            console.error("Google Auth Error:", error);
            res.status(401).json({ error: "Invalid Google token." });
        }
    },

    // Signup
    async signup(req, res) {
        const { email, password, confirm_password, full_name } = req.body;
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: "Email, password, and full name are required." });
        }
        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ error: "Passwords do not match." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }

        const pool = getPool();
        const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)",
            [email, password_hash, full_name]
        );

        const user = { id: result.insertId, email, role: "user", full_name };
        const token = generateToken(user, false);

        // Set HttpOnly cookie
        setAuthCookie(res, token, false);

        res.status(201).json({
            message: "Account created successfully!",
            token, // Still returned for backward compat / localStorage user info
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }
        });
    },

    // Login
    async login(req, res) {
        const { email, password, rememberMe } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        const pool = getPool();
        const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        await pool.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

        const token = generateToken(user, rememberMe || false);

        // Set HttpOnly cookie
        setAuthCookie(res, token, rememberMe || false);

        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }
        });
    },

    // Logout — clears the HttpOnly cookie
    async logout(req, res) {
        clearAuthCookie(res);
        res.json({ message: "Logged out successfully" });
    },

    // Verify Token — for session persistence
    async verifyToken(req, res) {
        const pool = getPool();
        const [users] = await pool.execute(
            "SELECT id, email, full_name, role FROM users WHERE id = ?",
            [req.user.id]
        );
        if (users.length === 0) {
            clearAuthCookie(res);
            return res.status(401).json({ error: "User not found.", code: 401 });
        }
        const user = users[0];
        res.json({
            valid: true,
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }
        });
    },

    // Forgot Password (Mock)
    async forgotPassword(req, res) {
        const { email } = req.body;
        const pool = getPool();
        const [users] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length > 0) {
            console.log(`Mock Action: Sending password reset email to ${email}`);
        }
        res.json({ message: "If this email is registered, a password reset link has been sent to it." });
    },

    // Admin Login
    async adminLogin(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        const pool = getPool();
        const [users] = await pool.execute("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email]);
        if (users.length === 0) return res.status(403).json({ error: "Access denied. Admin privileges required." });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(403).json({ error: "Invalid credentials." });

        await pool.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

        const token = generateToken(user, false);
        setAuthCookie(res, token, false);

        res.json({
            message: "Admin login successful",
            token,
            admin: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }
        });
    },

    // Get all users (admin)
    async getUsers(req, res) {
        const pool = getPool();
        const [users] = await pool.execute("SELECT id, email, full_name, role, created_at FROM users");
        res.json(users);
    }
};

module.exports = authController;
