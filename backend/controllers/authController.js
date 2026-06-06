const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const { getPool } = require("../config/database");
const { generateToken, setAuthCookie, clearAuthCookie } = require("../middleware/authMiddleware");
const { validateUsername, validateEmail, VALID_COUNTRIES, VALID_GENDERS } = require("../middleware/securityMiddleware");
const { sendVerificationCodeEmail } = require("../services/emailService");
const { isDisposableEmail } = require("../utils/disposableEmailBlocker");

// In production, this client ID should come from .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "221163940818-dppku5etbk06uvkbrfbs19psbsud5r57.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// In-memory rate limiting per email for signup (max 5 signup attempts per email per hour)
const emailSignupAttempts = new Map();

function isEmailRateLimited(email) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxAttempts = 5;
    
    if (!emailSignupAttempts.has(email)) {
        emailSignupAttempts.set(email, []);
    }
    
    const attempts = emailSignupAttempts.get(email).filter(ts => now - ts < windowMs);
    emailSignupAttempts.set(email, attempts);
    
    if (attempts.length >= maxAttempts) {
        return true;
    }
    
    attempts.push(now);
    return false;
}

const authController = {
    // Google OAuth Login / Auto-signup
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
            const picture = payload['picture'] || null;

            const pool = getPool();
            const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
            let user;

            if (users.length > 0) {
                user = users[0];
                // Link google_id and update profile picture if needed
                await pool.execute(
                    "UPDATE users SET google_id = ?, is_verified = 1, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), auth_provider = 'google', profile_picture = COALESCE(profile_picture, ?) WHERE id = ?",
                    [google_id, picture, user.id]
                );
                user.google_id = google_id;
                user.is_verified = 1;
                user.auth_provider = 'google';
                user.profile_picture = user.profile_picture || picture;
                
                await pool.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
            } else {
                // Create new user for this Google account
                const [result] = await pool.execute(
                    "INSERT INTO users (email, password_hash, full_name, google_id, is_verified, auth_provider, email_verified_at, profile_picture) VALUES (?, NULL, ?, ?, 1, 'google', CURRENT_TIMESTAMP, ?)",
                    [email, full_name, google_id, picture]
                );
                user = { id: result.insertId, email, role: "user", full_name, is_verified: 1, auth_provider: 'google', profile_picture: picture };
            }

            const token = generateToken(user, true); // True for rememberMe since it's Google
            setAuthCookie(res, token, true);

            res.json({
                message: "Google Login successful",
                token,
                user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, profile_picture: user.profile_picture }
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

        // Anti-Fake Email Protection: Disposable Email check
        if (isDisposableEmail(emailCheck.email)) {
            return res.status(400).json({ error: "Disposable email addresses are not allowed." });
        }

        // Signup Rate Limiting: Per-Email check
        if (isEmailRateLimited(emailCheck.email)) {
            return res.status(429).json({ error: "Too many signup attempts for this email. Please try again in an hour." });
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
        const [existing] = await pool.execute("SELECT * FROM users WHERE email = ?", [emailCheck.email]);
        let userId;

        if (existing.length > 0) {
            const existingUser = existing[0];
            if (existingUser.is_verified) {
                return res.status(409).json({ error: "An account with this email already exists." });
            }
            
            // Allow update of registration details for unverified accounts
            const password_hash = await bcrypt.hash(password, 10);
            await pool.execute(
                "UPDATE users SET password_hash = ?, full_name = ?, country = ?, gender = ?, auth_provider = 'local', is_verified = 0, email_verified_at = NULL WHERE id = ?",
                [password_hash, nameCheck.name, country || null, gender || null, existingUser.id]
            );
            userId = existingUser.id;
        } else {
            const password_hash = await bcrypt.hash(password, 10);
            const [result] = await pool.execute(
                "INSERT INTO users (email, password_hash, full_name, country, gender, is_verified, auth_provider) VALUES (?, ?, ?, ?, ?, 0, 'local')",
                [emailCheck.email, password_hash, nameCheck.name, country || null, gender || null]
            );
            userId = result.insertId;
        }

        // Generate secure 6-digit OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Hash OTP before saving
        const hashedOtp = await bcrypt.hash(otpCode, 10);

        // Save hashed OTP securely in the otps table
        await pool.execute(
            "INSERT INTO otps (user_id, otp_code, expires_at, attempts) VALUES (?, ?, ?, 0)",
            [userId, hashedOtp, otpExpiry]
        );

        // Send Email
        await sendVerificationCodeEmail(emailCheck.email, otpCode);

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
            const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            const hashedOtp = await bcrypt.hash(newCode, 10);
            await pool.execute(
                "INSERT INTO otps (user_id, otp_code, expires_at, attempts) VALUES (?, ?, ?, 0)",
                [user.id, hashedOtp, codeExpiry]
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
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, profile_picture: user.profile_picture }
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
            "SELECT id, email, full_name, role, profile_picture FROM users WHERE id = ?",
            [req.user.id]
        );
        if (users.length === 0) {
            clearAuthCookie(res);
            return res.status(401).json({ error: "User not found.", code: 401 });
        }
        const user = users[0];
        res.json({
            valid: true,
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, profile_picture: user.profile_picture }
        });
    },

    // Forgot Password
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

    // Verify OTP Code
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

        // Fetch latest OTP record for this user
        const [otps] = await pool.execute(
            "SELECT * FROM otps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            [user.id]
        );

        if (otps.length === 0) {
            return res.status(400).json({ error: "No verification code has been sent. Please register or request a new code." });
        }

        const otpRecord = otps[0];

        // Check if attempts exceeded (max 5 verification attempts)
        if (otpRecord.attempts >= 5) {
            return res.status(400).json({ error: "Too many incorrect attempts. This code is now invalid. Please request a new code." });
        }

        // Check expiry (10 minutes)
        const expiryDate = new Date(otpRecord.expires_at);
        if (expiryDate < new Date()) {
            return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
        }

        // Verify OTP code hash
        const isMatch = await bcrypt.compare(code, otpRecord.otp_code);
        if (!isMatch) {
            const newAttempts = otpRecord.attempts + 1;
            await pool.execute("UPDATE otps SET attempts = ? WHERE id = ?", [newAttempts, otpRecord.id]);
            
            if (newAttempts >= 5) {
                return res.status(400).json({ error: "Too many incorrect attempts. This code is now invalid. Please request a new code." });
            }
            
            return res.status(400).json({
                error: `Invalid verification code. You have ${5 - newAttempts} attempts remaining.`
            });
        }

        // Update user to verified
        await pool.execute(
            "UPDATE users SET is_verified = 1, email_verified_at = CURRENT_TIMESTAMP WHERE id = ?",
            [user.id]
        );

        // Delete successful OTP
        await pool.execute("DELETE FROM otps WHERE user_id = ?", [user.id]);

        const updatedUser = { id: user.id, email: user.email, role: user.role || 'user', full_name: user.full_name, profile_picture: user.profile_picture };
        const token = generateToken(updatedUser, false);
        setAuthCookie(res, token, false);

        res.json({
            message: "Email verification successful! Welcome to TrendScope.",
            token,
            user: updatedUser
        });
    },

    // Resend Verification OTP
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

        // Enforce 60-second cooldown period since last OTP creation
        const [lastOtps] = await pool.execute(
            "SELECT created_at FROM otps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            [user.id]
        );

        if (lastOtps.length > 0) {
            const lastCreated = new Date(lastOtps[0].created_at).getTime();
            const elapsed = Date.now() - lastCreated;
            if (elapsed < 60 * 1000) {
                const remaining = Math.ceil((60 * 1000 - elapsed) / 1000);
                return res.status(429).json({
                    error: `Please wait ${remaining} seconds before requesting a new code.`
                });
            }
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        const hashedOtp = await bcrypt.hash(newCode, 10);
        await pool.execute(
            "INSERT INTO otps (user_id, otp_code, expires_at, attempts) VALUES (?, ?, ?, 0)",
            [user.id, hashedOtp, codeExpiry]
        );

        await sendVerificationCodeEmail(email, newCode);

        res.json({
            message: "A new verification code has been sent to your email."
        });
    }
};

module.exports = authController;
