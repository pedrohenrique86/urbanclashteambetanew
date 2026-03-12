// Teste simples da API com o novo token
async function testNewToken() {
  try {
    const token = 'test-token-1750646162723-ciyp6j';
    const url = `http://localhost:3001/api/auth/confirm-email/${token}`;
    
    console.log('🔗 Testando URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ API funcionando corretamente!');
      console.log('✅ Mensagem:', data.message);
      console.log('✅ RedirectTo:', data.redirectTo);
      
      // Testar as condições do frontend
      if (data.message && (data.message.includes('confirmado com sucesso') || data.message === 'Email confirmado com sucesso')) {
        console.log('✅ Condição 1 do frontend: PASSOU');
      } else if (data.redirectTo) {
        console.log('✅ Condição 2 do frontend: PASSOU');
      } else {
        console.log('❌ Nenhuma condição do frontend passou');
      }
    } else {
      console.log('❌ Erro na API!');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testNewToken();