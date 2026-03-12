// Simulando exatamente como o frontend faz a requisição

async function testFrontendRequest() {
  const token = 'test-token-1750647259803-r8yqi4';
  const API_BASE_URL = 'http://localhost:3001/api';
  const endpoint = `/auth/confirm-email/${token}`;
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('🌐 URL construída pelo frontend:', url);
  console.log('🎫 Token:', token);
  
  try {
    console.log('📡 Fazendo requisição como o frontend...');
    
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    console.log('⚙️ Config da requisição:', config);
    
    const response = await fetch(url, config);
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📄 Response text:', text);
    
    let data;
    if (text) {
      try {
        data = JSON.parse(text);
        console.log('📄 Response JSON:', data);
      } catch (jsonError) {
        console.error('❌ Invalid JSON response:', text);
        console.log('❌ Retornando erro sem lançar exceção');
        return { error: 'Resposta inválida do servidor' };
      }
    } else {
      data = {};
    }
    
    if (!response.ok) {
      console.log('❌ Response not OK');
      console.log('❌ Data.error:', data.error);
      console.log('❌ Status:', response.status);
      console.log('❌ Retornando erro sem lançar exceção');
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }
    
    console.log('✅ Sucesso!');
    return data;
    
  } catch (error) {
    console.error('❌ API request failed:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

testFrontendRequest();