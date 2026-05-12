const { query } = require("../backend/config/database");

async function checkSchema() {
  try {
    const res = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='player_inventory';");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
