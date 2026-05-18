const { getPool } = require("../config/database");

/**
 * Handle feedback submission
 */
async function submitFeedback(req, res, next) {
    try {
        const { name, email, rating, message } = req.body;

        // Basic validation
        if (!name || !email || !rating || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const numericRating = parseInt(rating, 10);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const pool = getPool();
        await pool.execute(
            "INSERT INTO feedbacks (name, email, rating, message) VALUES (?, ?, ?, ?)",
            [name.trim(), email.trim(), numericRating, message.trim()]
        );

        return res.status(201).json({ message: "Feedback submitted successfully" });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all feedbacks (Admin only)
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

module.exports = {
    submitFeedback,
    getFeedbacks
};
