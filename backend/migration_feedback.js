const { getPool } = require("./config/database");

async function runMigration() {
    const db = getPool();
    try {
        console.log("🔧 Starting migration: Adding columns and approving existing feedbacks...");

        // 1. Add column is_approved
        try {
            await db.execute("ALTER TABLE feedbacks ADD COLUMN is_approved TINYINT(1) DEFAULT 0");
            console.log("✅ Column is_approved added successfully.");
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log("ℹ️ Column is_approved already exists.");
            } else {
                throw err;
            }
        }

        // 2. Add column is_hidden
        try {
            await db.execute("ALTER TABLE feedbacks ADD COLUMN is_hidden TINYINT(1) DEFAULT 0");
            console.log("✅ Column is_hidden added successfully.");
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log("ℹ️ Column is_hidden already exists.");
            } else {
                throw err;
            }
        }

        // 3. Approve existing feedback records
        const [result] = await db.execute("UPDATE feedbacks SET is_approved = 1 WHERE is_approved = 0");
        console.log(`✅ Approved ${result.affectedRows} existing feedback records.`);

        console.log("🎉 Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err.message || err);
        process.exit(1);
    }
}

runMigration();
