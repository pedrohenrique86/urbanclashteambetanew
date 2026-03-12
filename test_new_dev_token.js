const axios = require('axios');

const token = 'dev-token-1750651712741-447bef';
const url = `http://localhost:3001/api/auth/confirm-email/${token}`;

console.log('🔍 Testando novo token:', token);
console.log('🌐 URL:', url);

axios.get(url)
  .then((response) => {
    console.log('📊 Status:', response.status);
    console.log('📝 Response:', JSON.stringify(response.data, null, 2));
    console.log('✅ Token válido!');
  })
  .catch(error => {
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📝 Response:', JSON.stringify(error.response.data, null, 2));
      console.log('❌ Token inválido ou erro no servidor');
    } else {
      console.error('❌ Erro na requisição:', error.message);
    }
  });