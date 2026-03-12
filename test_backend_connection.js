const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

async function testBackendConnection() {
  try {
    console.log('🔗 Testando conexão com o backend...');
    console.log(`URL: ${API_BASE_URL}`);
    
    // Teste simples de conexão
    console.log('\n1. Testando endpoint básico...');
    try {
      const response = await axios.get(`${API_BASE_URL}/`);
      console.log('✅ Resposta:', response.status, response.data);
    } catch (error) {
      console.log('❌ Erro no endpoint básico:', error.code || error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Data:', error.response.data);
      }
    }
    
    // Teste de registro
    console.log('\n2. Testando endpoint de registro...');
    try {
      const registerData = {
        email: `test${Date.now()}@test.com`,
        password: 'TestPassword123!',
        username: `TestUser${Date.now()}`
      };
      
      console.log('Dados de registro:', registerData);
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, registerData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Registro bem-sucedido:', response.status, response.data);
      
    } catch (error) {
      console.log('❌ Erro no registro:', error.code || error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Headers:', error.response.headers);
        console.log('   Data:', error.response.data);
      } else if (error.request) {
        console.log('   Request foi feito mas sem resposta');
        console.log('   Request:', error.request);
      } else {
        console.log('   Erro na configuração:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testBackendConnection();