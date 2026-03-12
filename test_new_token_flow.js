const axios = require('axios');

const testToken = 'dev-token-1750652254056-9d3c29';
const baseURL = 'http://localhost:3001';

async function testEmailConfirmation() {
  try {
    console.log('🔍 Testando confirmação de email com token:', testToken);
    
    const response = await axios.get(`${baseURL}/api/auth/confirm-email/${testToken}`);
    
    console.log('✅ Status:', response.status);
    console.log('✅ Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.token) {
      console.log('🔑 Token JWT recebido:', response.data.token.substring(0, 20) + '...');
    }
    
    if (response.data.isFirstLogin) {
      console.log('👤 Primeiro login detectado');
    }
    
    if (response.data.redirectTo) {
      console.log('🔄 Redirecionamento configurado para:', response.data.redirectTo);
    }
    
  } catch (error) {
    console.error('❌ Erro na confirmação:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data?.error || error.message);
  }
}

testEmailConfirmation();