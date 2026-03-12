const axios = require('axios');

async function testApiUsername() {
  try {
    console.log('🔄 Testando API de perfil...');
    
    // Primeiro, fazer login para obter um token válido
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@urbanclash.com',
      password: 'test123'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login realizado com sucesso');
      
      // Agora testar a API de perfil
      const profileResponse = await axios.get('http://localhost:3001/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('\n📊 Resposta da API de perfil:');
      console.log('Username:', profileResponse.data.username);
      console.log('Faction:', profileResponse.data.faction);
      console.log('Level:', profileResponse.data.level);
      console.log('\n🔍 Dados completos do perfil:');
      console.log(JSON.stringify(profileResponse.data, null, 2));
      
    } else {
      console.error('❌ Falha no login - token não recebido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.response?.data || error.message);
  }
}

testApiUsername();