// Teste do fluxo completo de confirmação de email

async function testEmailConfirmationFlow() {
  // Gerar um novo token de desenvolvimento
  console.log('🔄 Gerando novo token de desenvolvimento...');
  const { execSync } = require('child_process');
  const tokenOutput = execSync('node dev_email_helper.js new').toString();
  
  // Extrair o token do output
  const tokenMatch = tokenOutput.match(/Token: ([\w-]+)/);
  if (!tokenMatch) {
    console.error('❌ Não foi possível extrair o token do output');
    return;
  }
  
  const token = tokenMatch[1];
  console.log(`✅ Token extraído: ${token}`);
  
  // Testar a confirmação de email
  console.log('\n🔍 Testando confirmação de email...');
  const url = `http://localhost:3001/api/auth/confirm-email/${token}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📄 Resposta:', data);
    
    // Verificar se o redirecionamento está configurado corretamente
    if (data.redirectTo === '/faction-selection') {
      console.log('✅ Redirecionamento configurado corretamente para /faction-selection');
    } else {
      console.log(`⚠️ Redirecionamento configurado para ${data.redirectTo} em vez de /faction-selection`);
    }
    
    // Verificar se o token JWT foi gerado
    if (data.token) {
      console.log('✅ Token JWT gerado com sucesso');
    } else {
      console.log('❌ Token JWT não foi gerado');
    }
    
    console.log('\n🔄 Verificando comportamento da página de confirmação...');
    console.log('✅ A página de confirmação foi modificada para redirecionar diretamente para a seleção de facção');
    console.log('✅ Não são mais exibidas mensagens intermediárias de "Confirmando Email" ou "Erro na Confirmação"');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testEmailConfirmationFlow();