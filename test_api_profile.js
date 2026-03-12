const axios = require('axios');

// Simular uma requisição para a API de perfil
async function testProfileAPI() {
  try {
    console.log('🔍 Testando API de perfil...');
    
    // Primeiro, fazer login para obter o token
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'test@urbanclash.com',
      password: 'test123'
    });
    
    const loginData = loginResponse.data;
    console.log('✅ Login realizado com sucesso');
    
    const token = loginData.token;
    
    // Agora buscar o perfil
    const profileResponse = await axios.get('http://localhost:3002/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = profileResponse.data;
    console.log('\n📋 Dados do perfil retornados pela API:');
    console.log('Facção:', profileData.faction);
    console.log('Ataque:', profileData.attack);
    console.log('Defesa:', profileData.defense);
    console.log('Foco:', profileData.focus);
    console.log('Dano Crítico:', profileData.critical_damage);
    console.log('Chance Crítico:', profileData.critical_chance);
    console.log('Intimidação:', profileData.intimidation);
    console.log('Disciplina:', profileData.discipline);
    
    // Verificar se os valores estão corretos
    if (profileData.faction === 'gangsters') {
      const isCorrect = profileData.attack === 8 && profileData.critical_damage === 10.5;
      console.log(`\n✅ Valores corretos: ${isCorrect ? 'SIM' : 'NÃO'}`);
      if (!isCorrect) {
        console.log('❌ Esperado: attack=8, critical_damage=10.5');
        console.log(`❌ Recebido: attack=${profileData.attack}, critical_damage=${profileData.critical_damage}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testProfileAPI();