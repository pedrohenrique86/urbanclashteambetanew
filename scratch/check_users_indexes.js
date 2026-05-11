const { query } = require('../backend/config/database');

async function checkIndexes() {
    try {
        const { rows } = await query(`
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'users'
        `);
        console.log("Current indexes on table 'users':");
        rows.forEach(r => console.log(`- ${r.indexname}: ${r.indexdef}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkIndexes();
