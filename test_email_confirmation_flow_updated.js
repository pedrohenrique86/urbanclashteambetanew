// Script para testar o fluxo de confirmação de email atualizado
// Usando fetch nativo do Node.js moderno

async function testEmailConfirmationFlow() {
  try {
    console.log('🧪 Testando o fluxo de confirmação de email atualizado...');
    
    // Usar o token gerado pelo comando anterior
    const token = 'dev-token-1750651347370-7691a8';
    console.log(`🎫 Usando token: ${token}`);
    
    // Confirmar o email
    console.log('🔄 Confirmando email...');
    const confirmResponse = await fetch(`http://localhost:3001/api/auth/confirm-email/${token}`);
    const confirmStatus = confirmResponse.status;
    const confirmData = await confirmResponse.json();
    
    console.log(`✅ Status da confirmação: ${confirmStatus}`);
    console.log('📋 Resposta da confirmação:', JSON.stringify(confirmData, null, 2));
    
    // Verificar se a resposta contém o campo redirectTo com valor '/'
    if (confirmData.redirectTo === '/') {
      console.log('✅ Redirecionamento para a página inicial (login) confirmado!');
    } else {
      console.log(`❌ Redirecionamento incorreto: ${confirmData.redirectTo}`);
    }
    
    // Verificar se o token não está presente na resposta
    if (!confirmData.token) {
      console.log('✅ Token não está presente na resposta, forçando login!');
    } else {
      console.log('❌ Token ainda está presente na resposta!');
    }
    
    // Testar o login após confirmação
    console.log('\n🔄 Testando login após confirmação...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'dev-test-1750651347370@example.com',
        password: 'senha123' // Senha padrão para usuários de desenvolvimento
      })
    });
    
    const loginStatus = loginResponse.status;
    const loginData = await loginResponse.json();
    
    console.log(`✅ Status do login: ${loginStatus}`);
    console.log('📋 Resposta do login:', JSON.stringify(loginData, null, 2));
    
    // Verificar se a resposta contém o campo isFirstLogin
    if (loginData.isFirstLogin === true) {
      console.log('✅ Campo isFirstLogin está presente e é true!');
    } else {
      console.log(`❌ Campo isFirstLogin incorreto: ${loginData.isFirstLogin}`);
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('O fluxo atualizado deve:');
    console.log('1. Mostrar uma mensagem de sucesso na confirmação de email');
    console.log('2. Redirecionar para a página de login');
    console.log('3. Após o login, redirecionar para a seleção de facção por ser o primeiro login');
    console.log('4. Após selecionar a facção, redirecionar para a seleção de clã');
    console.log('5. Finalmente, redirecionar para o dashboard');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testEmailConfirmationFlow();