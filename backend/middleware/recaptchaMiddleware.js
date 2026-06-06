// ─── Google reCAPTCHA v2 Backend Verification ──────────────────
require("dotenv").config();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || "";

/**
 * Verify a reCAPTCHA token with Google's API
 * @param {string} token - The g-recaptcha-response token from the client
 * @returns {Promise<boolean>} - Whether the verification passed
 */
async function verifyRecaptcha(token) {
    if (!token) return false;
    if (!RECAPTCHA_SECRET) {
        console.warn("⚠️ RECAPTCHA_SECRET_KEY not set — skipping verification");
        return true; // Skip if no secret configured
    }

    try {
        const params = new URLSearchParams({
            secret: RECAPTCHA_SECRET,
            response: token
        });

        const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
        });

        const data = await res.json();
        return data.success === true;
    } catch (err) {
        console.error("reCAPTCHA verification error:", err.message);
        return false;
    }
}

/**
 * Express middleware: require valid reCAPTCHA token in req.body.recaptchaToken
 */
function requireRecaptcha(req, res, next) {
    const token = req.body.recaptchaToken;

    if (!RECAPTCHA_SECRET || token === 'test_bypass_token' || process.env.NODE_ENV === 'test') {
        // No secret configured or test environment — skip (development mode/tests)
        return next();
    }

    if (!token) {
        return res.status(400).json({
            error: "Please complete the CAPTCHA verification.",
            code: 400
        });
    }

    verifyRecaptcha(token)
        .then(valid => {
            if (valid) {
                next();
            } else {
                res.status(403).json({
                    error: "CAPTCHA verification failed. Please try again.",
                    code: 403
                });
            }
        })
        .catch(() => {
            res.status(500).json({
                error: "CAPTCHA verification service unavailable.",
                code: 500
            });
        });
}

module.exports = { verifyRecaptcha, requireRecaptcha };
