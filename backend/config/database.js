const mysql = require("mysql2/promise");
require("dotenv").config();

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "",
            database: process.env.DB_NAME || "trendscope",
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000
        });
    }
    return pool;
}

async function initDatabase() {
    const db = getPool();

    // ─── Users table (existing) ─────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            google_id VARCHAR(255) UNIQUE NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME NULL
        )
    `);

    // ─── Videos table ───────────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS videos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            youtube_id VARCHAR(64) NOT NULL,
            title VARCHAR(500) NOT NULL,
            channel_name VARCHAR(255) NOT NULL,
            thumbnail_url VARCHAR(1000) DEFAULT '',
            views BIGINT DEFAULT 0,
            likes BIGINT DEFAULT 0,
            comments BIGINT DEFAULT 0,
            engagement_rate DECIMAL(8,4) DEFAULT 0,
            viral_probability INT DEFAULT 0,
            category VARCHAR(100) DEFAULT 'Entertainment',
            region VARCHAR(10) DEFAULT 'US',
            upload_date VARCHAR(100) DEFAULT '',
            duration VARCHAR(20) DEFAULT '',
            growth_rate INT DEFAULT 0,
            channel_subs VARCHAR(50) DEFAULT '',
            channel_avatar VARCHAR(1000) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_youtube_id (youtube_id),
            INDEX idx_region (region),
            INDEX idx_created_at (created_at),
            INDEX idx_region_created (region, created_at)
        )
    `);

    // ─── Creators table ─────────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS creators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            channel_name VARCHAR(255) NOT NULL,
            subscriber_count VARCHAR(50) DEFAULT '0',
            total_views BIGINT DEFAULT 0,
            video_count INT DEFAULT 0,
            region VARCHAR(10) DEFAULT 'US',
            channel_avatar VARCHAR(1000) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_channel_region (channel_name, region),
            INDEX idx_region (region)
        )
    `);

    // ─── Trend History table ────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS trend_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            video_youtube_id VARCHAR(64) NOT NULL,
            title VARCHAR(500) NOT NULL,
            channel_name VARCHAR(255) NOT NULL,
            thumbnail_url VARCHAR(1000) DEFAULT '',
            views BIGINT DEFAULT 0,
            likes BIGINT DEFAULT 0,
            comments BIGINT DEFAULT 0,
            engagement_rate DECIMAL(8,4) DEFAULT 0,
            viral_probability INT DEFAULT 0,
            ranking INT DEFAULT 0,
            category VARCHAR(100) DEFAULT 'Entertainment',
            region VARCHAR(10) DEFAULT 'US',
            upload_date VARCHAR(100) DEFAULT '',
            growth_rate INT DEFAULT 0,
            snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_region_snapshot (region, snapshot_date),
            INDEX idx_video_snapshot (video_youtube_id, snapshot_date),
            INDEX idx_snapshot_date (snapshot_date)
        )
    `);

    // ─── Regions table ──────────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS regions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(10) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            total_trending_videos INT DEFAULT 0,
            avg_engagement DECIMAL(8,4) DEFAULT 0,
            avg_views BIGINT DEFAULT 0,
            top_category VARCHAR(100) DEFAULT '',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // ─── Keywords table ─────────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS keywords (
            id INT AUTO_INCREMENT PRIMARY KEY,
            term VARCHAR(255) NOT NULL,
            search_volume INT DEFAULT 0,
            heat_level ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'LOW',
            growth_pct DECIMAL(8,2) DEFAULT 0,
            region VARCHAR(10) DEFAULT 'US',
            snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_region_snapshot (region, snapshot_date),
            INDEX idx_term (term)
        )
    `);

    // ─── Saved Trends table ─────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS saved_trends (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            video_youtube_id VARCHAR(64) NOT NULL,
            video_title VARCHAR(500) DEFAULT '',
            channel_name VARCHAR(255) DEFAULT '',
            thumbnail_url VARCHAR(1000) DEFAULT '',
            views BIGINT DEFAULT 0,
            likes BIGINT DEFAULT 0,
            category VARCHAR(100) DEFAULT '',
            region VARCHAR(10) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_video (user_id, video_youtube_id),
            INDEX idx_user_id (user_id),
            CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // ─── System Logs table ──────────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_type VARCHAR(50) NOT NULL,
            message VARCHAR(500) NOT NULL,
            user_id INT NULL,
            ip_address VARCHAR(45) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_event_type (event_type),
            INDEX idx_created_at (created_at)
        )
    `);

    // ─── System Settings table ──────────────────────────────────
    await db.execute(`
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // ─── Seed default settings ──────────────────────────────────
    await db.execute(
        `INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES 
        ('maintenance_mode', 'false'),
        ('allow_signups', 'true'),
        ('data_retention_days', '30')`
    );

    // ─── Seed default regions ───────────────────────────────────
    const regionSeeds = [
        ["US", "United States"], ["GB", "United Kingdom"], ["IN", "India"],
        ["JP", "Japan"], ["BR", "Brazil"], ["DE", "Germany"],
        ["FR", "France"], ["KR", "South Korea"]
    ];
    for (const [code, name] of regionSeeds) {
        await db.execute(
            `INSERT IGNORE INTO regions (code, name) VALUES (?, ?)`,
            [code, name]
        );
    }

    console.log("✅ All database tables initialized");
    return db;
}

module.exports = { getPool, initDatabase };
