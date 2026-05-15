const fetch = require('node-fetch');

async function testClansApi() {
  try {
    const url = 'http://localhost:3001/api/clans?faction=gangsters';
    console.log(`Testing URL: ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Clans count:", data.clans?.length);
    console.log("First clan:", data.clans?.[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}

testClansApi();
