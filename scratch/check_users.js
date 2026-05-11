const { query, connectDB } = require('./backend/config/database');

async function check() {
  try {
    await connectDB();
    const r = await query('SELECT id, username FROM users');
    console.log('Total users:', r.rows.length);
    console.log('Sample:', r.rows.slice(0, 5));
  } catch (e) {
    console.error(e);
  }
}

check();
