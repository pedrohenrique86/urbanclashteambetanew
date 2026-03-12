// Script para debugar os dados que chegam no frontend
const axios = require('axios');

async function debugFrontendData() {
  try {
    console.log('🔍 Debugando dados do frontend...');
    
    // Login
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'test@urbanclash.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    
    // Buscar perfil
    const profileResponse = await axios.get('http://localhost:3002/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = profileResponse.data;
    console.log('\n📋 Dados brutos da API:');
    console.log('Raw data:', JSON.stringify(profileData, null, 2));
    
    console.log('\n🔍 Verificação específica dos campos:');
    console.log('attack:', profileData.attack, '(tipo:', typeof profileData.attack, ')');
    console.log('critical_damage:', profileData.critical_damage, '(tipo:', typeof profileData.critical_damage, ')');
    console.log('defense:', profileData.defense, '(tipo:', typeof profileData.defense, ')');
    console.log('focus:', profileData.focus, '(tipo:', typeof profileData.focus, ')');
    
    // Simular o processamento do frontend
    console.log('\n🧮 Simulando calculateCombatStats:');
    
    const userProfile = {
      attack: profileData.attack,
      defense: profileData.defense,
      focus: profileData.focus,
      critical_damage: profileData.critical_damage,
      faction: profileData.faction
    };
    
    console.log('userProfile processado:', userProfile);
    
    // Simular a função calculateCombatStats
    const attack = userProfile.attack;
    const defense = userProfile.defense;
    const focus = userProfile.focus;
    const criticalChance = focus * 2;
    const criticalDamage = userProfile.critical_damage || 0;
    
    console.log('\n📊 Resultado do calculateCombatStats:');
    console.log('attack:', attack);
    console.log('defense:', defense);
    console.log('focus:', focus);
    console.log('criticalChance:', criticalChance);
    console.log('criticalDamage:', criticalDamage);
    
    // Verificar se há algum problema
    if (criticalDamage === 0 && profileData.critical_damage !== 0) {
      console.log('\n❌ PROBLEMA ENCONTRADO!');
      console.log('critical_damage da API:', profileData.critical_damage);
      console.log('criticalDamage calculado:', criticalDamage);
      console.log('Fallback para 0 foi ativado!');
    } else {
      console.log('\n✅ Dados parecem corretos');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugFrontendData();