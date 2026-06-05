const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const path = require("path");
const cron = require("node-cron");
require("dotenv").config();

const { initDatabase, getPool } = require("./config/database");
const { errorMiddleware } = require("./middleware/errorHandler");
const { helmetConfig, hppProtection, sanitizeBody, globalLimiter } = require("./middleware/securityMiddleware");
const trendService = require("./services/trendService");
const { fetchRealTrends } = require("./services/youtubeService");

// Route imports
const authRoutes = require("./routes/authRoutes");
const trendRoutes = require("./routes/trendRoutes");
const savedTrendRoutes = require("./routes/savedTrendRoutes");
const adminRoutes = require("./routes/adminRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────
app.use(helmetConfig);
app.use(hppProtection);

// ─── Core Middleware ─────────────────────────────────────────
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeBody);
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ─── Global Rate Limiter (API routes only) ───────────────────
app.use("/api", globalLimiter);

// ─── API Routes ─────────────────────────────────────────────
app.use("/api", authRoutes);
app.use("/api", trendRoutes);
app.use("/api/saved-trends", savedTrendRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", feedbackRoutes);

// ─── Error Handler ──────────────────────────────────────────
app.use(errorMiddleware);

// ─── Root Route ─────────────────────────────────────────────
app.get("/", (req, res) => {
    res.send("TrendScope Backend Running");
});

// ─── Fallback — serve frontend ──────────────────────────────
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// ─── Start Server ───────────────────────────────────────────
async function start() {
    try {
        // Initialize database tables
        await initDatabase();

        // Inject default admin if not exists
        const pool = getPool();
        const [adminCheck] = await pool.execute(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (adminCheck.length === 0) {
            const adminHash = await bcrypt.hash("admin123", 10);

            await pool.execute(
                "INSERT INTO users (email, password_hash, full_name, role, is_verified) VALUES (?, ?, ?, ?, 1)",
                ["admin@trendscope.com", adminHash, "System Admin", "admin"]
            );

            console.log("🔑 Default admin created: admin@trendscope.com / admin123");
        }

        // Start auto-cleanup
        trendService.startAutoCleanup(7);

        // Hourly trend snapshot
        cron.schedule("0 * * * *", async () => {
            console.log("🕒 Running hourly trend snapshot...");

            const regions = ["US", "GB", "IN", "JP", "BR"];

            for (const region of regions) {
                try {
                    const videos = await fetchRealTrends(region);
                    await trendService.snapshotTrends(videos, region);
                } catch (err) {
                    console.error(`❌ Hourly snapshot failed for ${region}:`, err.message);
                }
            }

            console.log("✅ Hourly snapshot complete.");
        });

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 TrendScope Server running on port ${PORT}`);
            console.log(`📊 Historical Trend Tracking System active`);
        });

    } catch (err) {
        console.error("❌ Server startup failed:", err.message || err);

        if (err.code === "ECONNREFUSED") {
            console.error("💡 MySQL server is not running.");
        }

        process.exit(1);
    }
}

start();
