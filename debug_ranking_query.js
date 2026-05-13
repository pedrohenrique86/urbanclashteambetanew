const { query } = require("./backend/config/database");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend/.env") });

async function debugRankingQuery() {
  try {
    console.log("Using Database URL:", process.env.LIBSQL_URL);
    const sql = `SELECT user_id, level, total_xp, faction FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 2000`;
    console.log("Running Query:", sql);
    const { rows } = await query(sql);
    console.log("Rows found:", rows.length);
    if (rows.length > 0) {
      console.log("Sample row:", rows[0]);
    }
    process.exit(0);
  } catch (err) {
    console.error("Query Error:", err);
    process.exit(1);
  }
}

debugRankingQuery();
