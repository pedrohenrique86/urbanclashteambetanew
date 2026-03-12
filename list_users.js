require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function main() {
  try {
    const result = await pool.query('SELECT id, email, email_confirmation_token, is_email_confirmed, created_at FROM users ORDER BY created_at DESC LIMIT 20');
    for(const row of result.rows){
      console.log(row);
    }
  } catch (err) {
    console.error('Erro ao consultar usuários:', err.message);
  } finally {
    await pool.end();
  }
}

main();