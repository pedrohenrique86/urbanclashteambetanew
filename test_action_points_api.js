const axios = require('axios');

// Configuração da API
const API_BASE = 'http://localhost:3001/api';
const TEST_EMAIL = 'apitest@urbanclash.com';
const TEST_PASSWORD = 'test123';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    console.log('✅ Login realizado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testActionPointsAPI() {
  try {
    console.log('\n🧪 Testando APIs de Pontos de Ação...');
    
    // Headers com autenticação
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Obter pontos de ação atuais
    console.log('\n📊 1. Obtendo pontos de ação atuais:');
    const getResponse = await axios.get(`${API_BASE}/users/action-points`, { headers });
    console.log('✅ Resposta:', JSON.stringify(getResponse.data, null, 2));
    
    const currentPoints = getResponse.data.action_points;
    
    // 2. Consumir pontos de ação
    console.log('\n⚡ 2. Consumindo 1000 pontos de ação:');
    const consumeResponse = await axios.post(`${API_BASE}/users/action-points/consume`, 
      { amount: 1000 }, 
      { headers }
    );
    console.log('✅ Resposta:', JSON.stringify(consumeResponse.data, null, 2));
    
    // 3. Verificar pontos após consumo
    console.log('\n📊 3. Verificando pontos após consumo:');
    const getAfterConsumeResponse = await axios.get(`${API_BASE}/users/action-points`, { headers });
    console.log('✅ Resposta:', JSON.stringify(getAfterConsumeResponse.data, null, 2));
    
    // 4. Tentar consumir mais pontos do que disponível
    console.log('\n❌ 4. Tentando consumir mais pontos do que disponível (50000):');
    try {
      await axios.post(`${API_BASE}/users/action-points/consume`, 
        { amount: 50000 }, 
        { headers }
      );
    } catch (error) {
      console.log('✅ Erro esperado:', error.response?.data || error.message);
    }
    
    // 5. Reset dos pontos de ação
    console.log('\n🔄 5. Resetando pontos de ação:');
    const resetResponse = await axios.post(`${API_BASE}/users/action-points/reset`, {}, { headers });
    console.log('✅ Resposta:', JSON.stringify(resetResponse.data, null, 2));
    
    // 6. Verificar pontos após reset
    console.log('\n📊 6. Verificando pontos após reset:');
    const getAfterResetResponse = await axios.get(`${API_BASE}/users/action-points`, { headers });
    console.log('✅ Resposta:', JSON.stringify(getAfterResetResponse.data, null, 2));
    
    // 7. Testar validação de entrada inválida
    console.log('\n❌ 7. Testando validação com entrada inválida:');
    try {
      await axios.post(`${API_BASE}/users/action-points/consume`, 
        { amount: -100 }, 
        { headers }
      );
    } catch (error) {
      console.log('✅ Erro esperado para valor negativo:', error.response?.data || error.message);
    }
    
    try {
      await axios.post(`${API_BASE}/users/action-points/consume`, 
        { amount: 0 }, 
        { headers }
      );
    } catch (error) {
      console.log('✅ Erro esperado para valor zero:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Teste das APIs de pontos de ação concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste das APIs:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes das APIs de Pontos de Ação...');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Não foi possível fazer login. Encerrando testes.');
    return;
  }
  
  await testActionPointsAPI();
  
  console.log('\n✨ Todos os testes concluídos!');
}

runTests();