const Video = require("../models/Video");
const Creator = require("../models/Creator");
const TrendHistory = require("../models/TrendHistory");
const Region = require("../models/Region");
const Keyword = require("../models/Keyword");

const trendService = {
    /**
     * Take a snapshot of current trending videos — stores into all tables
     */
    async snapshotTrends(videos, region) {
        if (!videos || videos.length === 0) return { stored: 0 };

        try {
            // 1. Store/update videos
            await Video.bulkUpsert(videos, region);

            // 2. Store/update creators
            await Creator.bulkUpsertFromVideos(videos, region);

            // 3. Record trend history snapshot
            await TrendHistory.recordSnapshot(videos, region);

            // 4. Update region stats
            await Region.updateStats(region, videos);

            // 5. Record keywords
            await Keyword.recordKeywords(videos, region);

            console.log(`📸 Snapshot stored: ${videos.length} videos for ${region}`);
            return { stored: videos.length, region, timestamp: new Date().toISOString() };
        } catch (err) {
            console.error("❌ Snapshot error:", err.message);
            throw err;
        }
    },

    /**
     * Get historical trend data for a region
     */
    async getHistory(region, days) {
        const history = await TrendHistory.getHistory(region, days);
        const aggregates = await TrendHistory.getDailyAggregates(region, days);
        const regionPopularity = await TrendHistory.getRegionPopularity(days);

        return {
            trends: history,
            dailyStats: aggregates,
            regionPopularity,
            period: `${days} days`,
            totalRecords: history.length
        };
    },

    /**
     * Get comparison data: today vs yesterday
     */
    async getComparison(region) {
        const { today, yesterday } = await TrendHistory.getComparison(region);

        // Calculate deltas
        const todayViews = today.reduce((s, v) => s + Number(v.views), 0);
        const yesterdayViews = yesterday.reduce((s, v) => s + Number(v.views), 0);
        const todayEng = today.length > 0 ? today.reduce((s, v) => s + Number(v.engagement_rate), 0) / today.length : 0;
        const yesterdayEng = yesterday.length > 0 ? yesterday.reduce((s, v) => s + Number(v.engagement_rate), 0) / yesterday.length : 0;
        const todayViral = today.length > 0 ? today.reduce((s, v) => s + Number(v.viral_probability), 0) / today.length : 0;
        const yesterdayViral = yesterday.length > 0 ? yesterday.reduce((s, v) => s + Number(v.viral_probability), 0) / yesterday.length : 0;

        const viewsChange = yesterdayViews > 0 ? ((todayViews - yesterdayViews) / yesterdayViews * 100) : 0;
        const engChange = yesterdayEng > 0 ? ((todayEng - yesterdayEng) / yesterdayEng * 100) : 0;
        const viralChange = yesterdayViral > 0 ? ((todayViral - yesterdayViral) / yesterdayViral * 100) : 0;

        // Track ranking changes for top videos
        const rankingChanges = [];
        today.forEach(t => {
            const prev = yesterday.find(y => y.video_youtube_id === t.video_youtube_id);
            rankingChanges.push({
                video_id: t.video_youtube_id,
                title: t.title,
                channel: t.channel_name,
                current_rank: t.ranking,
                previous_rank: prev ? prev.ranking : null,
                movement: prev ? prev.ranking - t.ranking : 0,
                views_today: Number(t.views),
                views_yesterday: prev ? Number(prev.views) : 0
            });
        });

        // Determine overall trend movement
        let trendMovement = "stable";
        if (viewsChange > 10) trendMovement = "rising";
        else if (viewsChange < -10) trendMovement = "falling";

        return {
            summary: {
                views_change_pct: parseFloat(viewsChange.toFixed(2)),
                engagement_change_pct: parseFloat(engChange.toFixed(2)),
                viral_change_pct: parseFloat(viralChange.toFixed(2)),
                trend_movement: trendMovement,
                today_total_views: todayViews,
                yesterday_total_views: yesterdayViews,
                today_count: today.length,
                yesterday_count: yesterday.length
            },
            rankings: rankingChanges.slice(0, 10),
            today: today.slice(0, 10),
            yesterday: yesterday.slice(0, 10)
        };
    },

    /**
     * Cleanup old records — call periodically
     */
    async cleanup(maxDays = 7) {
        try {
            const vDel = await Video.deleteOlderThan(maxDays);
            const tDel = await TrendHistory.deleteOlderThan(maxDays);
            const kDel = await Keyword.deleteOlderThan(maxDays);
            console.log(`🧹 Cleanup: removed ${vDel} videos, ${tDel} history records, ${kDel} keywords older than ${maxDays} days`);
            return { videos: vDel, history: tDel, keywords: kDel };
        } catch (err) {
            console.error("❌ Cleanup error:", err.message);
        }
    },

    /**
     * Start automatic cleanup interval (every 6 hours)
     */
    startAutoCleanup(maxDays = 7) {
        // Run cleanup immediately on start
        trendService.cleanup(maxDays);
        // Then every 6 hours
        setInterval(() => trendService.cleanup(maxDays), 6 * 60 * 60 * 1000);
        console.log("🔄 Auto-cleanup scheduled every 6 hours");
    }
};

module.exports = trendService;
