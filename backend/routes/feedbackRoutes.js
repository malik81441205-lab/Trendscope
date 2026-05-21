const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { submitFeedback, getFeedbacks, getPublicFeedback, approveFeedback, hideFeedback, deleteFeedback } = require("../controllers/feedbackController");
const { requireAuth, isAdmin } = require("../middleware/authMiddleware");

// Rate limit for feedback submission
const feedbackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many feedback submissions. Please try again later." }
});

// POST /api/feedback — Public (rate-limited)
router.post("/feedback", feedbackLimiter, submitFeedback);

// GET /api/public-feedback — Public (approved & visible only)
router.get("/public-feedback", getPublicFeedback);

// GET /api/feedback — Admin only (all feedbacks)
router.get("/feedback", requireAuth, isAdmin, getFeedbacks);

// PUT /api/admin/feedback/approve/:id — Admin only
router.put("/admin/feedback/approve/:id", requireAuth, isAdmin, approveFeedback);

// PUT /api/admin/feedback/hide/:id — Admin only
router.put("/admin/feedback/hide/:id", requireAuth, isAdmin, hideFeedback);

// DELETE /api/admin/feedback/:id — Admin only
router.delete("/admin/feedback/:id", requireAuth, isAdmin, deleteFeedback);

module.exports = router;
