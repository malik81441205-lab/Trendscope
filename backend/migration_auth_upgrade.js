// ─── Migration: Add columns to users table & Create otps table ──────────────
// Run this once to apply the schema upgrades for authentication.
//
// Usage: node migration_auth_upgrade.js
// ────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { getPool } = require("./config/database");

async function runMigration() {
    const db = getPool();

    console.log("🔧 Starting migration: TrendScope Auth Upgrade...\n");

    // --- Verify database connection ---------------------------------------
    try {
        await db.execute("SELECT 1");
        console.log("✅ Database connection established.\n");
    } catch (err) {
        console.error("❌ Cannot connect to database:", err.message);
        process.exit(1);
    }

    // --- Apply migrations to users table safely (idempotent) --------------
    const userMigrations = [
        {
            sql: "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'",
            column: "auth_provider",
            description: "Adding auth_provider VARCHAR(50) DEFAULT 'local'"
        },
        {
            sql: "ALTER TABLE users ADD COLUMN email_verified_at DATETIME DEFAULT NULL",
            column: "email_verified_at",
            description: "Adding email_verified_at DATETIME DEFAULT NULL"
        },
        {
            sql: "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
            column: "updated_at",
            description: "Adding updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        },
        {
            sql: "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(1000) DEFAULT NULL",
            column: "profile_picture",
            description: "Adding profile_picture VARCHAR(1000) DEFAULT NULL"
        }
    ];

    let appliedCount = 0;
    let skippedCount = 0;

    for (const m of userMigrations) {
        try {
            await db.execute(m.sql);
            console.log(`  ✅ ${m.description} — APPLIED`);
            appliedCount++;
        } catch (err) {
            if (err.code === "ER_DUP_COLUMN_NAME") {
                console.log(`  ℹ️  Column '${m.column}' already exists — SKIPPED`);
                skippedCount++;
            } else {
                console.error(`  ❌ Migration failed for column '${m.column}':`, err.message);
                process.exit(1);
            }
        }
    }

    console.log();

    // --- Create OTPs table safely -----------------------------------------
    try {
        console.log("🔧 Creating OTP table...");
        await db.execute(`
            CREATE TABLE IF NOT EXISTS otps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                otp_code VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                attempts INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("  ✅ OTP table initialized successfully.");
    } catch (err) {
        console.error("  ❌ Failed to create OTP table:", err.message);
        process.exit(1);
    }

    console.log();
    console.log(`🎉 Migration complete. Columns applied: ${appliedCount}, Skipped: ${skippedCount}`);
    process.exit(0);
}

runMigration();
