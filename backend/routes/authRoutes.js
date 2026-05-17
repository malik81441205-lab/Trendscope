const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRecaptcha } = require("../middleware/recaptchaMiddleware");

// reCAPTCHA-protected auth routes
router.post("/signup", requireRecaptcha, asyncHandler(authController.signup));
router.post("/login", requireRecaptcha, asyncHandler(authController.login));
router.post("/google-login", asyncHandler(authController.googleLogin));
router.post("/forgot-password", requireRecaptcha, asyncHandler(authController.forgotPassword));
router.post("/admin-login", asyncHandler(authController.adminLogin));

// Logout — clears HttpOnly cookie
router.post("/logout", asyncHandler(authController.logout));

// Token verification — protected by requireAuth
router.get("/verify-token", requireAuth, asyncHandler(authController.verifyToken));

// Expose reCAPTCHA site key to frontend
router.get("/recaptcha-key", (req, res) => {
    res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || "" });
});

module.exports = router;
