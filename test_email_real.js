const axios = require('axios');

// Teste real de cadastro e recuperação de senha
async function testEmailFlow() {
  console.log('🧪 Testando fluxo completo de emails...');
  
  const testUser = {
    username: `testuser${Math.floor(Math.random() * 10000)}`,
    email: 'urbanclashteam@gmail.com', // Email real para teste
    password: 'TestPassword123!'
  };
  
  try {
    console.log('\n📝 1. Testando CADASTRO com envio de email...');
    console.log('👤 Usuário:', testUser.username);
    console.log('📧 Email:', testUser.email);
    
    const registerResponse = await axios.post('http://localhost:3001/api/auth/register', testUser);
    
    if (registerResponse.status === 201) {
      console.log('✅ Cadastro realizado com sucesso!');
      console.log('📨 Email de confirmação deve ter sido enviado!');
    }
    
    console.log('\n🔐 2. Testando RECUPERAÇÃO DE SENHA...');
    
    const resetResponse = await axios.post('http://localhost:3001/api/auth/forgot-password', {
      email: testUser.email
    });
    
    if (resetResponse.status === 200) {
      console.log('✅ Solicitação de recuperação enviada!');
      console.log('📨 Email de recuperação deve ter sido enviado!');
    }
    
    console.log('\n📋 RESUMO:');
    console.log('📧 Verifique a caixa de entrada de:', testUser.email);
    console.log('📬 Deve ter 2 emails:');
    console.log('   1. Confirmação de cadastro');
    console.log('   2. Recuperação de senha');
    console.log('🚫 Ambos com remetente noreply configurado');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Erro:', error.response.status);
      console.log('📄 Detalhes:', error.response.data);
    } else {
      console.log('❌ Erro de conexão:', error.message);
    }
  }
}

testEmailFlow();