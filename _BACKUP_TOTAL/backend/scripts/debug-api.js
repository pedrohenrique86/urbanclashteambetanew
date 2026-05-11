const axios = require('axios');

async function debug() {
  try {
    const res = await axios.get('http://localhost:3001/api/clans/74bad4be-e6b6-4fe2-a70a-8b8889258342');
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
  }
}

debug();
