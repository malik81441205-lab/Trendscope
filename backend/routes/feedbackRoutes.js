const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { submitFeedback, getFeedbacks } = require("../controllers/feedbackController");
const { requireAuth, isAdmin } = require("../middleware/authMiddleware");

// Rate limit for feedback submission to prevent spam
const feedbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 submissions per window
    message: { error: "Too many feedback submissions from this IP, please try again later." }
});

// POST /api/feedback - Public endpoint to submit feedback
router.post("/feedback", feedbackLimiter, submitFeedback);

// GET /api/feedback - Admin only endpoint to retrieve feedback
router.get("/feedback", requireAuth, isAdmin, getFeedbacks);

module.exports = router;
