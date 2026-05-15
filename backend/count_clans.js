const { query } = require("./config/database");

async function countClans() {
  try {
    const res = await query("SELECT faction, COUNT(*) as count FROM clans GROUP BY faction");
    console.log("Clans by faction string:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

countClans();
