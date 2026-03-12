const axios = require('axios');

// Token que está sendo usado no frontend (do erro)
const token = '2c6028a7f3eb44da58744dbcd75168fd5ab7aacc79d776f6d60a09d3fec2593e';
const url = `http://localhost:3001/api/auth/confirm-email/${token}`;

console.log('🔍 Testando token do frontend:', token);
console.log('🌐 URL:', url);

axios.get(url)
  .then((response) => {
    console.log('📊 Status:', response.status);
    console.log('📝 Response:', JSON.stringify(response.data, null, 2));
    console.log('✅ Token do frontend é válido!');
  })
  .catch(error => {
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📝 Response:', JSON.stringify(error.response.data, null, 2));
      console.log('❌ Token do frontend é inválido - precisa usar o novo token!');
    } else {
      console.error('❌ Erro na requisição:', error.message);
    }
  });