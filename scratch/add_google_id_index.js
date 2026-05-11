const { query } = require('../backend/config/database');

async function addIndex() {
    try {
        console.log("Checking for index on users(google_id)...");
        
        // Verifica se o índice já existe
        const checkIndex = await query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'users' AND indexname = 'idx_users_google_id'
        `);

        if (checkIndex.rows.length === 0) {
            console.log("Adding index idx_users_google_id...");
            await query(`CREATE INDEX idx_users_google_id ON users(google_id)`);
            console.log("Index added successfully!");
        } else {
            console.log("Index already exists.");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error adding index:", e.message);
        process.exit(1);
    }
}

addIndex();
