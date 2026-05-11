const { query } = require("../backend/config/database");

async function dumpSchema() {
  try {
    console.log("--- TABLES ---");
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(tables.rows.map(r => r.table_name));

    for (const table of tables.rows) {
      const tName = table.table_name;
      console.log(`\n--- COLUMNS FOR ${tName} ---`);
      const columns = await query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tName]);
      console.table(columns.rows);
    }

  } catch (err) {
    console.error("Error dumping schema:", err.message);
  }
}

dumpSchema();
