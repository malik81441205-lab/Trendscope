const { getPool } = require("../config/database");

const SavedTrend = {
    async save(userId, videoData) {
        const db = getPool();
        const [result] = await db.execute(
            `INSERT INTO saved_trends (user_id, video_youtube_id, video_title, channel_name, thumbnail_url, views, likes, category, region)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE views = VALUES(views), likes = VALUES(likes)`,
            [userId, videoData.video_youtube_id, videoData.video_title || "", videoData.channel_name || "",
             videoData.thumbnail_url || "", videoData.views || 0, videoData.likes || 0,
             videoData.category || "", videoData.region || ""]
        );
        return result;
    },

    async getByUserId(userId) {
        const db = getPool();
        const [rows] = await db.execute(
            "SELECT * FROM saved_trends WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [userId]
        );
        return rows;
    },

    async deleteById(id, userId) {
        const db = getPool();
        const [result] = await db.execute(
            "DELETE FROM saved_trends WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        return result.affectedRows > 0;
    },

    async checkIfSaved(userId, videoYoutubeId) {
        const db = getPool();
        const [rows] = await db.execute(
            "SELECT id FROM saved_trends WHERE user_id = ? AND video_youtube_id = ?",
            [userId, videoYoutubeId]
        );
        return rows.length > 0;
    },

    async getSavedIds(userId) {
        const db = getPool();
        const [rows] = await db.execute(
            "SELECT video_youtube_id FROM saved_trends WHERE user_id = ?",
            [userId]
        );
        return rows.map(r => r.video_youtube_id);
    }
};

module.exports = SavedTrend;
