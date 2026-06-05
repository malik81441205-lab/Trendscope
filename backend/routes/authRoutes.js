const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRecaptcha } = require("../middleware/recaptchaMiddleware");
const { loginLimiter, signupLimiter, adminLoginLimiter } = require("../middleware/securityMiddleware");

// reCAPTCHA + rate-limited auth routes
router.post("/signup", signupLimiter, requireRecaptcha, asyncHandler(authController.signup));
router.post("/login", loginLimiter, requireRecaptcha, asyncHandler(authController.login));
router.post("/verify-email", asyncHandler(authController.verifyEmail));
router.post("/resend-code", asyncHandler(authController.resendCode));
router.post("/google-login", loginLimiter, asyncHandler(authController.googleLogin));
router.post("/forgot-password", loginLimiter, requireRecaptcha, asyncHandler(authController.forgotPassword));
router.post("/admin-login", adminLoginLimiter, asyncHandler(authController.adminLogin));

// Logout — clears HttpOnly cookie
router.post("/logout", asyncHandler(authController.logout));

// Token verification — protected by requireAuth
router.get("/verify-token", requireAuth, asyncHandler(authController.verifyToken));

// Expose reCAPTCHA site key to frontend
router.get("/recaptcha-key", (req, res) => {
    res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || "" });
});

module.exports = router;
