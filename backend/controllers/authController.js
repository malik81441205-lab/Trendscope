const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const { getPool } = require("../config/database");
const { generateToken, setAuthCookie, clearAuthCookie } = require("../middleware/authMiddleware");
const { validateUsername, validateEmail, VALID_COUNTRIES, VALID_GENDERS } = require("../middleware/securityMiddleware");
const { sendVerificationCodeEmail } = require("../services/emailService");

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
                // Auto verify if logging in via Google
                if (!user.is_verified) {
                    await pool.execute("UPDATE users SET is_verified = 1 WHERE id = ?", [user.id]);
                    user.is_verified = 1;
                }
                await pool.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
            } else {
                // Create new user for this Google account
                const [result] = await pool.execute(
                    "INSERT INTO users (email, password_hash, full_name, google_id, is_verified) VALUES (?, NULL, ?, ?, 1)",
                    [email, full_name, google_id]
                );
                user = { id: result.insertId, email, role: "user", full_name, is_verified: 1 };
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
        const { email, password, confirm_password, full_name, country, gender } = req.body;
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: "Email, password, and full name are required." });
        }

        // Username validation (reserved names, alpha-start, alphanumeric)
        const nameCheck = validateUsername(full_name);
        if (!nameCheck.valid) {
            return res.status(400).json({ error: nameCheck.error });
        }

        // Email validation
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
            return res.status(400).json({ error: emailCheck.error });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ error: "Passwords do not match." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }

        // Country validation (if provided)
        if (country && !VALID_COUNTRIES.includes(country)) {
            return res.status(400).json({ error: "Please select a valid country." });
        }

        // Gender validation (if provided)
        if (gender && !VALID_GENDERS.includes(gender)) {
            return res.status(400).json({ error: "Please select a valid gender." });
        }

        const pool = getPool();
        const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [emailCheck.email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const [result] = await pool.execute(
            "INSERT INTO users (email, password_hash, full_name, country, gender, is_verified, verification_code, verification_code_expires) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
            [emailCheck.email, password_hash, nameCheck.name, country || null, gender || null, verificationCode, codeExpiry]
        );

        // Send email
        await sendVerificationCodeEmail(emailCheck.email, verificationCode);

        res.status(201).json({
            message: "Verification code sent. Please check your email to complete registration.",
            verification_required: true,
            email: emailCheck.email
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

        // Prevent login with password for OAuth-only accounts
        if (!user.password_hash) {
            return res.status(401).json({ error: "This account uses Google Sign-In. Please log in with Google." });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        // Check if verified
        if (!user.is_verified) {
            // Automatically resend a code for convenience
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            const codeExpiry = new Date(Date.now() + 15 * 60 * 1000);
            await pool.execute(
                "UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?",
                [newCode, codeExpiry, user.id]
            );
            await sendVerificationCodeEmail(user.email, newCode);

            return res.status(403).json({
                error: "Your email address is not verified. A verification code has been sent to your email.",
                verification_required: true,
                email: user.email
            });
        }

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

    // Verify Email Code
    async verifyEmail(req, res) {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: "Email and verification code are required." });
        }

        const pool = getPool();
        const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: "User account not found." });
        }

        const user = users[0];
        if (user.is_verified) {
            return res.status(400).json({ error: "Email address is already verified." });
        }

        if (user.verification_code !== code) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        const expiryDate = new Date(user.verification_code_expires);
        if (expiryDate < new Date()) {
            return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
        }

        // Update user to verified
        await pool.execute(
            "UPDATE users SET is_verified = 1, verification_code = NULL, verification_code_expires = NULL WHERE id = ?",
            [user.id]
        );

        // Track role and details
        const updatedUser = { id: user.id, email: user.email, role: user.role || 'user', full_name: user.full_name };
        const token = generateToken(updatedUser, false);
        setAuthCookie(res, token, false);

        res.json({
            message: "Email verification successful! Welcome to TrendScope.",
            token,
            user: updatedUser
        });
    },

    // Resend Verification Code
    async resendCode(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        const pool = getPool();
        const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: "User account not found." });
        }

        const user = users[0];
        if (user.is_verified) {
            return res.status(400).json({ error: "Email address is already verified." });
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await pool.execute(
            "UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?",
            [newCode, codeExpiry, user.id]
        );

        await sendVerificationCodeEmail(email, newCode);

        res.json({
            message: "A new verification code has been sent to your email."
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
