// Script para testar a rota de verificação de email no backend local
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCheckEmailBackend() {
  // Obter o email do argumento da linha de comando ou usar um padrão
  const email = process.argv[2] || 'teste@exemplo.com';
  
  try {
    console.log(`🔍 Testando verificação de email: ${email}`);
    
    // Fazer requisição para a API local
    const response = await fetch('http://localhost:3001/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    console.log(`📊 Status da resposta: ${response.status}`);
    
    // Obter o corpo da resposta
    const responseText = await response.text();
    console.log(`📝 Resposta bruta: ${responseText}`);
    
    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        console.log(`✅ Resposta parseada:`);
        console.log(`   - Email existe: ${result.exists}`);
        console.log(`   - Email confirmado: ${result.confirmed}`);
      } catch (e) {
        console.error(`❌ Erro ao fazer parse da resposta JSON: ${e.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao fazer requisição: ${error.message}`);
  }
}

testCheckEmailBackend();