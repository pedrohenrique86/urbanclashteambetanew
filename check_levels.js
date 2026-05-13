const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'dev.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT u.username, p.level, p.total_xp FROM users u JOIN user_profiles p ON u.id = p.user_id", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
  });
});
