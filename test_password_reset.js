const axios = require('axios');

// Teste específico de recuperação de senha
async function testPasswordReset() {
  console.log('🧪 Testando RECUPERAÇÃO DE SENHA...');
  
  const testEmail = 'urbanclashteam@gmail.com'; // Email que já existe
  
  try {
    console.log('📧 Enviando solicitação para:', testEmail);
    
    const response = await axios.post('http://localhost:3001/api/auth/forgot-password', {
      email: testEmail
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Status:', response.status);
    console.log('📨 Resposta:', response.data);
    console.log('📬 Verifique a caixa de entrada de:', testEmail);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Erro HTTP:', error.response.status);
      console.log('📄 Detalhes:', error.response.data);
    } else if (error.request) {
      console.log('❌ Erro de rede - sem resposta do servidor');
      console.log('🔍 Detalhes:', error.message);
    } else {
      console.log('❌ Erro:', error.message);
    }
  }
}

// Primeiro testar se o servidor está respondendo
async function testHealth() {
  try {
    console.log('🏥 Testando health check...');
    const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
    console.log('✅ Servidor está funcionando:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Servidor não está respondendo:', error.message);
    return false;
  }
}

async function runTests() {
  const isHealthy = await testHealth();
  if (isHealthy) {
    await testPasswordReset();
  } else {
    console.log('🚫 Não é possível testar - servidor não está funcionando');
  }
}

runTests();