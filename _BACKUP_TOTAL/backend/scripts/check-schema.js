require('dotenv').config();
const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL_DEV,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
    `);
    console.log('Columns in user_profiles:');
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    
    const resClans = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clans'
    `);
    console.log('\nColumns in clans:');
    resClans.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
