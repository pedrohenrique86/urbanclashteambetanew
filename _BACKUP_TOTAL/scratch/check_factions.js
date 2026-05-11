const { query } = require('../backend/config/database');

async function check() {
    try {
        const { rows } = await query(`SELECT user_id, username, faction FROM user_profiles`);
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
