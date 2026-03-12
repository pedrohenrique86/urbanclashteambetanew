// Script para testar a função serverless check-email.js
const fetch = require('node-fetch');

async function testCheckEmail() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Por favor, forneça um email como argumento.');
    console.log('Exemplo: node test_check_email.js teste@exemplo.com');
    return;
  }
  
  console.log(`Testando email: ${email}`);
  
  try {
    // Substitua a URL pela URL correta da sua função serverless
    const response = await fetch('http://localhost:8888/.netlify/functions/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const responseText = await response.text();
    console.log('Resposta bruta:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Resposta parseada:');
      console.log('- Email existe:', data.exists);
      console.log('- Email confirmado:', data.confirmed);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e.message);
    }
  } catch (error) {
    console.error('Erro ao fazer requisição:', error.message);
  }
}

testCheckEmail();