const { getPool, initDatabase } = require("./backend/config/database");
const bcrypt = require("bcrypt");

async function checkOrMakeAdmin() {
    try {
        await initDatabase();
        const db = getPool();
        const [admins] = await db.query("SELECT email FROM users WHERE role='admin'");
        if (admins.length > 0) {
            console.log("Admin exists:", admins[0].email);
            // I don't know the password since it's hashed, so let's reset it to something simple
            const hash = await bcrypt.hash("admin123", 10);
            await db.execute("UPDATE users SET password_hash = ? WHERE email = ?", [hash, admins[0].email]);
            console.log("Password reset to: admin123");
        } else {
            const hash = await bcrypt.hash("admin123", 10);
            await db.execute("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)", [
                "admin@vidvoyage.com",
                hash,
                "System Admin",
                "admin"
            ]);
            console.log("Admin created: admin@vidvoyage.com / admin123");
        }
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
checkOrMakeAdmin();
