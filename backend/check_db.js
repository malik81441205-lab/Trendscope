const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./backend/.env" });

async function checkDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD || "",
            database: process.env.DB_NAME || "trendscope"
        });
        console.log("✅ Connected to MySQL");

        const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
        if (tables.length === 0) {
            console.log("❌ Table 'users' does not exist. Creating it...");
            await connection.execute(`
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    role ENUM('user', 'admin') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log("✅ Table 'users' created successfully.");
        } else {
            console.log("✅ Table 'users' already exists.");
            const [columns] = await connection.execute("DESCRIBE users");
            console.table(columns);
        }
        await connection.end();
    } catch (err) {
        console.error("❌ DB Check Failed:", err.message);
    }
}

checkDB();
