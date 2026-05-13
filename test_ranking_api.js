const axios = require("axios");

async function testRankingApi() {
  try {
    const res = await axios.get("http://localhost:3002/api/users/rankings?faction=renegados");
    console.log("API Response Status:", res.status);
    console.log("API Response Data:", JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("API Error:", err.message);
    if (err.response) {
        console.error("Response data:", err.response.data);
    }
    process.exit(1);
  }
}

testRankingApi();
