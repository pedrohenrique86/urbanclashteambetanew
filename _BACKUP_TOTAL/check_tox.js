const { query } = require('./backend/config/database');

async function run() {
  const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_ap_reset';");
  console.log("TOXICITY RESULT:", res.rows);
  process.exit(0);
}

run();
