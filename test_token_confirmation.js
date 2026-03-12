// Usando fetch nativo do Node.js moderno

async function testTokenConfirmation() {
  const token = 'dev-token-1750650025313-f35bd0';
  const url = `http://localhost:3001/api/auth/confirm-email/${token}`;
  
  console.log('🔍 Testando confirmação de email com token:', token);
  console.log('🌐 URL:', url);
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('📊 Status:', response.status);
    console.log('📄 Resposta:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('📋 Dados JSON:', data);
    } catch (jsonError) {
      console.log('⚠️ Resposta não é JSON válido');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testTokenConfirmation();