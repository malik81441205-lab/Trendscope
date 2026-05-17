const { getPool } = require("../config/database");

const TrendHistory = {
    /**
     * Record a snapshot of trending videos
     */
    async recordSnapshot(videos, region) {
        const db = getPool();
        const results = [];

        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            const engRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100) : 0;
            const viralProb = Math.min(99, Math.floor((v.growthRate || 10) / 1.5 + (engRate * 3)));

            const [result] = await db.execute(
                `INSERT INTO trend_history 
                    (video_youtube_id, title, channel_name, thumbnail_url, views, likes, comments,
                     engagement_rate, viral_probability, ranking, category, region, upload_date, growth_rate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    v.id, v.title, v.channel, v.thumbnail || "",
                    v.views || 0, v.likes || 0, v.comments || 0,
                    parseFloat(engRate.toFixed(4)), viralProb,
                    i + 1, // ranking position
                    v.category || "Entertainment", region,
                    v.publishedAt || "", v.growthRate || 0
                ]
            );
            results.push(result);
        }
        return results;
    },

    /**
     * Get historical data for a region within N days
     */
    async getHistory(region, days) {
        const db = getPool();
        let query = `
            SELECT *, DATE(snapshot_date) as snap_day
            FROM trend_history 
            WHERE snapshot_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const params = [days];

        if (region && region !== "GLOBAL") {
            query += " AND region = ?";
            params.push(region);
        }

        query += " ORDER BY snapshot_date DESC, ranking ASC LIMIT 500";
        const [rows] = await db.execute(query, params);
        return rows;
    },

    /**
     * Get comparison data: today vs yesterday
     */
    async getComparison(region) {
        const db = getPool();

        // Today's latest snapshot
        let todayQuery = `
            SELECT * FROM trend_history
            WHERE DATE(snapshot_date) = CURDATE()
        `;
        let yesterdayQuery = `
            SELECT * FROM trend_history
            WHERE DATE(snapshot_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        `;

        const params = [];
        if (region && region !== "GLOBAL") {
            todayQuery += " AND region = ?";
            yesterdayQuery += " AND region = ?";
            params.push(region);
        }

        todayQuery += " ORDER BY snapshot_date DESC, ranking ASC LIMIT 50";
        yesterdayQuery += " ORDER BY snapshot_date DESC, ranking ASC LIMIT 50";

        const [todayRows] = await db.execute(todayQuery, params);
        const [yesterdayRows] = await db.execute(yesterdayQuery, params);

        return { today: todayRows, yesterday: yesterdayRows };
    },

    /**
     * Get aggregated stats per day for charts
     */
    async getDailyAggregates(region, days) {
        const db = getPool();
        let query = `
            SELECT 
                DATE(snapshot_date) as day,
                SUM(views) as total_views,
                SUM(likes) as total_likes,
                SUM(comments) as total_comments,
                AVG(engagement_rate) as avg_engagement,
                AVG(viral_probability) as avg_viral_prob,
                COUNT(DISTINCT video_youtube_id) as unique_videos,
                MAX(views) as peak_views
            FROM trend_history
            WHERE snapshot_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const params = [days];

        if (region && region !== "GLOBAL") {
            query += " AND region = ?";
            params.push(region);
        }

        query += " GROUP BY DATE(snapshot_date) ORDER BY day ASC";
        const [rows] = await db.execute(query, params);
        return rows;
    },

    /**
     * Get region-wise popularity data
     */
    async getRegionPopularity(days) {
        const db = getPool();
        const [rows] = await db.execute(
            `SELECT 
                region,
                SUM(views) as total_views,
                AVG(engagement_rate) as avg_engagement,
                COUNT(DISTINCT video_youtube_id) as unique_videos,
                AVG(viral_probability) as avg_viral_prob
             FROM trend_history
             WHERE snapshot_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY region
             ORDER BY total_views DESC`,
            [days]
        );
        return rows;
    },

    /**
     * Delete records older than N days
     */
    async deleteOlderThan(days) {
        const db = getPool();
        const [result] = await db.execute(
            "DELETE FROM trend_history WHERE snapshot_date < DATE_SUB(NOW(), INTERVAL ? DAY)",
            [days]
        );
        return result.affectedRows;
    }
};

module.exports = TrendHistory;
