// Usando fetch nativo do Node.js

async function testAPI() {
  const token = 'test-token-1750647180166-56xhml';
  const url = `http://localhost:3001/api/auth/confirm-email/${token}`;
  
  console.log('🌐 Testando URL:', url);
  console.log('🎫 Token:', token);
  
  try {
    console.log('📡 Fazendo requisição...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('📄 Response JSON:', responseJson);
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse do JSON:', parseError.message);
    }
    
    if (response.ok) {
      console.log('✅ Sucesso!');
    } else {
      console.log('❌ Erro na resposta!');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

testAPI();