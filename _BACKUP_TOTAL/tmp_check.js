require('dotenv').config({ path: './backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
  const client = new Client();
  await client.connect();
  const res = await client.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE conrelid = 'items'::regclass");
  console.log(res.rows);
  await client.end();
})();
