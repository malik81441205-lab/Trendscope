const { getPool } = require("../config/database");

const Video = {
    /**
     * Insert or update a single video record
     */
    async upsert(video) {
        const db = getPool();
        const [result] = await db.execute(
            `INSERT INTO videos 
                (youtube_id, title, channel_name, thumbnail_url, views, likes, comments, 
                 engagement_rate, viral_probability, category, region, upload_date, duration, 
                 growth_rate, channel_subs, channel_avatar)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                title = VALUES(title), views = VALUES(views), likes = VALUES(likes),
                comments = VALUES(comments), engagement_rate = VALUES(engagement_rate),
                viral_probability = VALUES(viral_probability), growth_rate = VALUES(growth_rate),
                created_at = CURRENT_TIMESTAMP`,
            [
                video.youtube_id, video.title, video.channel_name, video.thumbnail_url || "",
                video.views || 0, video.likes || 0, video.comments || 0,
                video.engagement_rate || 0, video.viral_probability || 0,
                video.category || "Entertainment", video.region || "US",
                video.upload_date || "", video.duration || "",
                video.growth_rate || 0, video.channel_subs || "", video.channel_avatar || ""
            ]
        );
        return result;
    },

    /**
     * Bulk insert videos
     */
    async bulkUpsert(videos, region) {
        const db = getPool();
        const results = [];
        for (const v of videos) {
            const engRate = v.views > 0 ? ((v.likes + v.comments) / v.views * 100) : 0;
            const viralProb = Math.min(99, Math.floor((v.growthRate || 10) / 1.5 + (engRate * 3)));

            const result = await Video.upsert({
                youtube_id: v.id,
                title: v.title,
                channel_name: v.channel,
                thumbnail_url: v.thumbnail || "",
                views: v.views || 0,
                likes: v.likes || 0,
                comments: v.comments || 0,
                engagement_rate: parseFloat(engRate.toFixed(4)),
                viral_probability: viralProb,
                category: v.category || "Entertainment",
                region: region,
                upload_date: v.publishedAt || "",
                duration: v.duration || "",
                growth_rate: v.growthRate || 0,
                channel_subs: v.channelSubs || "",
                channel_avatar: v.channelAvatar || ""
            });
            results.push(result);
        }
        return results;
    },

    /**
     * Find by YouTube ID
     */
    async findByYoutubeId(youtubeId) {
        const db = getPool();
        const [rows] = await db.execute(
            "SELECT * FROM videos WHERE youtube_id = ? ORDER BY created_at DESC LIMIT 1",
            [youtubeId]
        );
        return rows[0] || null;
    },

    /**
     * Find videos by region within date range
     */
    async findByRegionAndDateRange(region, startDate, endDate) {
        const db = getPool();
        let query = "SELECT * FROM videos WHERE created_at BETWEEN ? AND ?";
        const params = [startDate, endDate];

        if (region && region !== "GLOBAL") {
            query += " AND region = ?";
            params.push(region);
        }

        query += " ORDER BY views DESC LIMIT 100";
        const [rows] = await db.execute(query, params);
        return rows;
    },

    /**
     * Delete records older than N days
     */
    async deleteOlderThan(days) {
        const db = getPool();
        const [result] = await db.execute(
            "DELETE FROM videos WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
            [days]
        );
        return result.affectedRows;
    }
};

module.exports = Video;
