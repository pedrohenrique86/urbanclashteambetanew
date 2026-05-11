const { Pool } = require("pg");
require("dotenv").config({ path: "./backend/.env" });

async function dumpSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_DEV,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const table of tables.rows) {
      const tName = table.table_name;
      console.log(`\nTABLE: ${tName}`);
      const columns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tName]);
      console.log(columns.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

dumpSchema();
