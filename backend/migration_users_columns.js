// ─── Migration: Add country & gender columns to users table ────────────────
// Run this once against the Railway MySQL database to fix the signup error:
//   "Unknown column 'country' in 'field list'"
//
// Usage: node migration_users_columns.js
// ────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { getPool } = require("./config/database");

async function runMigration() {
    const db = getPool();

    console.log("🔧 Starting migration: Adding country & gender columns to users table...\n");

    // --- Verify connection ------------------------------------------------
    try {
        await db.execute("SELECT 1");
        console.log("✅ Database connection established.\n");
    } catch (err) {
        console.error("❌ Cannot connect to database:", err.message);
        process.exit(1);
    }

    // --- Show current users table columns before migration ----------------
    try {
        const [cols] = await db.execute("SHOW COLUMNS FROM users");
        console.log("📋 Current users table columns:");
        cols.forEach(c => console.log(`   - ${c.Field} (${c.Type})`));
        console.log();
    } catch (err) {
        console.error("❌ Could not read users table schema:", err.message);
        process.exit(1);
    }

    // --- Apply migrations safely (idempotent) -----------------------------
    const migrations = [
        {
            sql: "ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT NULL",
            column: "country",
            description: "Adding country VARCHAR(100)"
        },
        {
            sql: "ALTER TABLE users ADD COLUMN gender ENUM('male','female','other','prefer_not_to_say') DEFAULT NULL",
            column: "gender",
            description: "Adding gender ENUM('male','female','other','prefer_not_to_say')"
        }
    ];

    let appliedCount = 0;
    let skippedCount = 0;

    for (const migration of migrations) {
        try {
            await db.execute(migration.sql);
            console.log(`✅ ${migration.description} — APPLIED`);
            appliedCount++;
        } catch (err) {
            if (err.code === "ER_DUP_COLUMN_NAME") {
                console.log(`ℹ️  Column '${migration.column}' already exists — SKIPPED`);
                skippedCount++;
            } else {
                console.error(`❌ Migration failed for column '${migration.column}':`, err.message);
                process.exit(1);
            }
        }
    }

    console.log();

    // --- Show updated schema after migration ------------------------------
    try {
        const [cols] = await db.execute("SHOW COLUMNS FROM users");
        console.log("📋 Updated users table columns:");
        cols.forEach(c => console.log(`   - ${c.Field} (${c.Type})`));
        console.log();
    } catch (err) {
        console.error("⚠️  Could not read updated schema:", err.message);
    }

    // --- Run a signup test query to confirm columns are accessible --------
    try {
        await db.execute(
            "SELECT id, email, full_name, country, gender FROM users LIMIT 1"
        );
        console.log("✅ Signup SELECT test (country, gender) — PASSED");
    } catch (err) {
        console.error("❌ Signup SELECT test FAILED:", err.message);
        process.exit(1);
    }

    console.log();
    console.log(`🎉 Migration complete. Applied: ${appliedCount}, Skipped (already existed): ${skippedCount}`);
    console.log("   Signup with country & gender should now work correctly.\n");

    process.exit(0);
}

runMigration();
