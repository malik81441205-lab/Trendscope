const { getPool } = require("../config/database");

/**
 * Handle feedback submission (public)
 */
async function submitFeedback(req, res, next) {
    try {
        const { name, email, rating, message } = req.body;

        if (!name || !email || !rating || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const numericRating = parseInt(rating, 10);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        if (message.trim().length < 10) {
            return res.status(400).json({ error: "Feedback message must be at least 10 characters." });
        }

        const pool = getPool();
        await pool.execute(
            "INSERT INTO feedbacks (name, email, rating, message, is_approved, is_hidden) VALUES (?, ?, ?, ?, 0, 0)",
            [name.trim(), email.trim(), numericRating, message.trim()]
        );

        return res.status(201).json({ message: "Thank you! Your feedback has been submitted for review." });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all feedbacks — Admin only (includes hidden/unapproved)
 */
async function getFeedbacks(req, res, next) {
    try {
        const pool = getPool();
        const [feedbacks] = await pool.execute(
            "SELECT * FROM feedbacks ORDER BY created_at DESC"
        );
        return res.status(200).json({ feedbacks });
    } catch (error) {
        next(error);
    }
}

/**
 * Get only approved & visible feedbacks — Public endpoint
 */
async function getPublicFeedback(req, res, next) {
    try {
        const pool = getPool();
        const [feedbacks] = await pool.execute(
            "SELECT id, name, rating, message, created_at FROM feedbacks WHERE is_approved = 1 AND is_hidden = 0 ORDER BY created_at DESC LIMIT 20"
        );
        return res.status(200).json({ feedbacks });
    } catch (error) {
        next(error);
    }
}

/**
 * Approve feedback — Admin only
 */
async function approveFeedback(req, res, next) {
    try {
        const { id } = req.params;
        const pool = getPool();
        const [result] = await pool.execute(
            "UPDATE feedbacks SET is_approved = 1 WHERE id = ?", [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Feedback not found." });
        }
        return res.json({ message: "Feedback approved successfully." });
    } catch (error) {
        next(error);
    }
}

/**
 * Hide/unhide feedback — Admin only
 */
async function hideFeedback(req, res, next) {
    try {
        const { id } = req.params;
        const pool = getPool();
        // Toggle is_hidden
        const [result] = await pool.execute(
            "UPDATE feedbacks SET is_hidden = NOT is_hidden WHERE id = ?", [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Feedback not found." });
        }
        return res.json({ message: "Feedback visibility toggled." });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete feedback permanently — Admin only
 */
async function deleteFeedback(req, res, next) {
    try {
        const { id } = req.params;
        const pool = getPool();
        const [result] = await pool.execute(
            "DELETE FROM feedbacks WHERE id = ?", [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Feedback not found." });
        }
        return res.json({ message: "Feedback deleted." });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    submitFeedback,
    getFeedbacks,
    getPublicFeedback,
    approveFeedback,
    hideFeedback,
    deleteFeedback
};
