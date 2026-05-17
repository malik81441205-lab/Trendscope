const { getPool } = require("../config/database");

const Region = {
    async updateStats(code, videos) {
        const db = getPool();
        const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
        const avgEng = videos.length > 0
            ? videos.reduce((s, v) => {
                const eng = v.views > 0 ? ((v.likes + v.comments) / v.views * 100) : 0;
                return s + eng;
            }, 0) / videos.length
            : 0;
        const catCounts = {};
        videos.forEach(v => { const cat = v.category || "Entertainment"; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

        await db.execute(
            `UPDATE regions SET total_trending_videos = ?, avg_engagement = ?, avg_views = ?, top_category = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?`,
            [videos.length, parseFloat(avgEng.toFixed(4)), Math.floor(totalViews / Math.max(videos.length, 1)), topCat ? topCat[0] : "Entertainment", code]
        );
    },

    async getAll() {
        const db = getPool();
        const [rows] = await db.execute("SELECT * FROM regions ORDER BY total_trending_videos DESC");
        return rows;
    },

    async getByCode(code) {
        const db = getPool();
        const [rows] = await db.execute("SELECT * FROM regions WHERE code = ?", [code]);
        return rows[0] || null;
    }
};

module.exports = Region;
