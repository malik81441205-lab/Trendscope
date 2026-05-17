const { getPool } = require("../config/database");

const Creator = {
    /**
     * Upsert a creator — update stats if already exists
     */
    async upsert(creator) {
        const db = getPool();
        const [result] = await db.execute(
            `INSERT INTO creators (channel_name, subscriber_count, total_views, video_count, region, channel_avatar)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                subscriber_count = VALUES(subscriber_count),
                total_views = total_views + VALUES(total_views),
                video_count = video_count + VALUES(video_count),
                channel_avatar = VALUES(channel_avatar),
                updated_at = CURRENT_TIMESTAMP`,
            [
                creator.channel_name,
                creator.subscriber_count || "0",
                creator.total_views || 0,
                creator.video_count || 1,
                creator.region || "US",
                creator.channel_avatar || ""
            ]
        );
        return result;
    },

    /**
     * Bulk upsert creators from video data
     */
    async bulkUpsertFromVideos(videos, region) {
        const channelMap = {};
        videos.forEach(v => {
            if (!channelMap[v.channel]) {
                channelMap[v.channel] = {
                    channel_name: v.channel,
                    subscriber_count: v.channelSubs || "0",
                    total_views: v.views || 0,
                    video_count: 1,
                    region: region,
                    channel_avatar: v.channelAvatar || ""
                };
            } else {
                channelMap[v.channel].total_views += v.views || 0;
                channelMap[v.channel].video_count += 1;
            }
        });

        const results = [];
        for (const creator of Object.values(channelMap)) {
            const result = await Creator.upsert(creator);
            results.push(result);
        }
        return results;
    },

    /**
     * Get top creators by region
     */
    async getTopByRegion(region, limit = 10) {
        const db = getPool();
        let query = "SELECT * FROM creators";
        const params = [];

        if (region && region !== "GLOBAL") {
            query += " WHERE region = ?";
            params.push(region);
        }

        query += " ORDER BY total_views DESC LIMIT ?";
        params.push(limit);

        const [rows] = await db.execute(query, params);
        return rows;
    },

    /**
     * Delete old creator records
     */
    async deleteOlderThan(days) {
        const db = getPool();
        const [result] = await db.execute(
            "DELETE FROM creators WHERE updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
            [days]
        );
        return result.affectedRows;
    }
};

module.exports = Creator;
