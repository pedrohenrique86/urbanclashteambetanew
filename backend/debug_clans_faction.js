const { query } = require("./config/database");

async function debugClans() {
  try {
    const res = await query("SELECT id, name, faction, faction_id FROM clans LIMIT 5");
    console.log("Clans sample:", res.rows);
    
    for (const row of res.rows) {
        console.log(`Clan: ${row.name} | Faction: '${row.faction}' | Length: ${row.faction?.length}`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit();
  }
}

debugClans();
