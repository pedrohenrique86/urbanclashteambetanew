const { query } = require("./config/database");

async function checkClans() {
  try {
    const res = await query("SELECT * FROM clans");
    console.log("Total clans:", res.rows.length);
    console.log("Clans data:", JSON.stringify(res.rows, null, 2));
    
    const factions = await query("SELECT * FROM factions");
    console.log("Factions:", JSON.stringify(factions.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

checkClans();
