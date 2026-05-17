const SavedTrend = require("../models/SavedTrend");
const { validateRequired } = require("../middleware/errorHandler");

const savedTrendController = {
    // POST /api/saved-trends — Bookmark a trend (user ID from JWT)
    async saveTrend(req, res) {
        const err = validateRequired(req.body, ["video_youtube_id"]);
        if (err) return res.status(400).json({ error: err, code: 400 });

        const userId = req.user.id; // From JWT token

        const result = await SavedTrend.save(userId, {
            video_youtube_id: req.body.video_youtube_id,
            video_title: req.body.video_title || "",
            channel_name: req.body.channel_name || "",
            thumbnail_url: req.body.thumbnail_url || "",
            views: req.body.views || 0,
            likes: req.body.likes || 0,
            category: req.body.category || "",
            region: req.body.region || ""
        });

        res.status(201).json({ message: "Trend saved", id: result.insertId });
    },

    // GET /api/saved-trends/mine — Get authenticated user's saved trends
    async getSavedTrends(req, res) {
        const userId = req.user.id; // From JWT token
        const trends = await SavedTrend.getByUserId(userId);
        res.json(trends);
    },

    // DELETE /api/saved-trends/:id — Remove a saved trend
    async deleteSavedTrend(req, res) {
        const id = parseInt(req.params.id);
        const userId = req.user.id; // From JWT token

        if (!id) {
            return res.status(400).json({ error: "Valid ID required.", code: 400 });
        }

        const deleted = await SavedTrend.deleteById(id, userId);
        if (!deleted) {
            return res.status(404).json({ error: "Saved trend not found.", code: 404 });
        }
        res.json({ message: "Saved trend removed." });
    },

    // GET /api/saved-trends/mine/ids — Get just the saved video IDs
    async getSavedIds(req, res) {
        const userId = req.user.id; // From JWT token
        const ids = await SavedTrend.getSavedIds(userId);
        res.json(ids);
    }
};

module.exports = savedTrendController;
