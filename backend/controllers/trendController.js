const { fetchRealTrends } = require("../services/youtubeService");
const trendService = require("../services/trendService");
const { validateRegion, validateDays } = require("../middleware/errorHandler");

const allCategories = [
    "Music", "Gaming", "Entertainment", "Sports", "Education",
    "Tech", "Food", "Travel", "News", "Comedy", "How-to", "Vlogs"
];

const trendController = {
    // GET /api/trends — Fetch live trends + auto-snapshot
    async getTrends(req, res) {
        const country = req.query.country || "GLOBAL";
        const fetchCode = country === "GLOBAL" ? "US" : country;

        const region = validateRegion(fetchCode);
        if (!region) {
            return res.status(400).json({ error: "Invalid region code.", code: 400 });
        }

        try {
            const videos = await fetchRealTrends(region);

            // Auto-snapshot to database (non-blocking)
            trendService.snapshotTrends(videos, region).catch(err => {
                console.error("Snapshot failed (non-blocking):", err.message);
            });

            res.json(videos);
        } catch (err) {
            console.error("Live API Error:", err.message);
            res.status(500).json({ error: "Failed to fetch live YouTube data: " + err.message });
        }
    },

    // GET /api/trends/history — Historical trend data
    async getHistory(req, res) {
        const region = validateRegion(req.query.region || "US");
        const days = validateDays(req.query.days || 7);

        if (!region) {
            return res.status(400).json({ error: "Invalid region code.", code: 400 });
        }

        const data = await trendService.getHistory(region, days);
        res.json(data);
    },

    // GET /api/trends/compare — Today vs yesterday comparison
    async getComparison(req, res) {
        const region = validateRegion(req.query.region || "US");

        if (!region) {
            return res.status(400).json({ error: "Invalid region code.", code: 400 });
        }

        const data = await trendService.getComparison(region);
        res.json(data);
    },

    // GET /api/categories
    async getCategories(req, res) {
        res.json(allCategories);
    }
};

module.exports = trendController;
