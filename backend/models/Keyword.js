const { getPool } = require("../config/database");

const Keyword = {
    async recordKeywords(videos, region) {
        const db = getPool();
        const stopWords = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","can","this","that","these","those","it","its","i","you","he","she","we","they","me","him","her","us","them","my","your","his","our","their","not","no","so","if","by","from","up","out","how","what","which","who","when","where","why","all","each","every","both","few","more","most","other","some","such","than","too","very","just","about","new","one","two","ft","vs"]);
        const wordCounts = {};
        videos.forEach(v => {
            const words = (v.title || "").toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));
            words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
        });

        const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
        const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

        for (const [term, count] of sorted) {
            const ratio = count / maxCount;
            const heat = ratio > 0.7 ? "HIGH" : ratio > 0.4 ? "MEDIUM" : "LOW";
            const growth = Math.floor(Math.random() * 400) + 50;
            await db.execute(
                `INSERT INTO keywords (term, search_volume, heat_level, growth_pct, region) VALUES (?, ?, ?, ?, ?)`,
                [term, count * 10000, heat, growth, region]
            );
        }
        return sorted.length;
    },

    async getByRegion(region, days = 7) {
        const db = getPool();
        let query = `SELECT term, MAX(search_volume) as search_volume, heat_level, MAX(growth_pct) as growth_pct, region
                     FROM keywords WHERE snapshot_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`;
        const params = [days];
        if (region && region !== "GLOBAL") { query += " AND region = ?"; params.push(region); }
        query += " GROUP BY term, heat_level, region ORDER BY search_volume DESC LIMIT 20";
        const [rows] = await db.execute(query, params);
        return rows;
    },

    async deleteOlderThan(days) {
        const db = getPool();
        const [result] = await db.execute("DELETE FROM keywords WHERE snapshot_date < DATE_SUB(NOW(), INTERVAL ? DAY)", [days]);
        return result.affectedRows;
    }
};

module.exports = Keyword;
