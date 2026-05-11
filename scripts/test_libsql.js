const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

async function setup() {
  const dbPath = path.join(__dirname, "../dev.db");
  const client = createClient({ url: `file:${dbPath}` });
  
  try {
    await client.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)");
    console.log("✅ Test table created.");
    await client.execute("INSERT INTO test (id) VALUES (1)");
    const res = await client.execute("SELECT * FROM test");
    console.log("✅ Data:", res.rows);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

setup();
