// Script para testar a função serverless check-email.js localmente
const { handler } = require('./netlify/functions/check-email');

async function testCheckEmailLocal() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Por favor, forneça um email como argumento.');
    console.log('Exemplo: node test_check_email_local.js teste@exemplo.com');
    return;
  }
  
  console.log(`Testando email: ${email}`);
  
  try {
    // Criar um evento simulado
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ email })
    };
    
    // Chamar o handler diretamente
    const response = await handler(event, {});
    
    console.log('Status da resposta:', response.statusCode);
    console.log('Resposta bruta:', response.body);
    
    try {
      const data = JSON.parse(response.body);
      console.log('Resposta parseada:');
      console.log('- Email existe:', data.exists);
      console.log('- Email confirmado:', data.confirmed);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e.message);
    }
  } catch (error) {
    console.error('Erro ao executar a função:', error.message);
  }
}

testCheckEmailLocal();