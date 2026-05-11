
const { query } = require('./backend/config/database');
const sql = 'SELECT * FROM user_profiles WHERE user_id = $1';
query(sql, ['33370224-6b8a-40dc-b9c5-fe4d0653f752'])
  .then(res => console.log(JSON.stringify(res.rows[0], null, 2)))
  .catch(err => console.error(err))
  .finally(() => process.exit());
