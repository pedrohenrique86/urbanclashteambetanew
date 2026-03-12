const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'admin123',
  port: 5432,
});

async function testUserRegistration() {
  try {
    console.log('🧪 Testando registro de usuário gangster...');
    
    // Dados do usuário de teste
    const testUser = {
      email: 'teste_gangster@test.com',
      username: 'teste_gangster',
      password: 'Test123!@#'
    };
    
    // 1. Registrar usuário
    console.log('📝 Registrando usuário...');
    const registerResponse = await axios.post('http://localhost:3001/api/auth/register', testUser);
    console.log('✅ Usuário registrado:', registerResponse.data);
    
    // 2. Fazer login para obter token
    console.log('🔑 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    const token = loginResponse.data.token;
    console.log('✅ Login realizado');
    
    // 3. Criar perfil com facção Gangster
    console.log('🎯 Criando perfil com facção Gangster...');
    const factionResponse = await axios.post('http://localhost:3001/api/users/profile', {
      faction: 'gangsters',
      username: testUser.username
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Perfil criado:', factionResponse.data);
    
    // 4. Verificar dados no banco
    console.log('🔍 Verificando dados no banco...');
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [testUser.email]);
    
    if (userResult.rows.length === 0) {
      throw new Error('Usuário não encontrado na tabela users');
    }
    
    const userId = userResult.rows[0].id;
    console.log('👤 Usuário encontrado:', userResult.rows[0]);
    
    const profileQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
    const profileResult = await pool.query(profileQuery, [userId]);
    
    if (profileResult.rows.length === 0) {
      throw new Error('Perfil do usuário não encontrado na tabela user_profiles');
    }
    
    const profile = profileResult.rows[0];
    console.log('📊 Perfil do usuário:', profile);
    
    // 4. Verificar valores esperados para Gangster
    const expectedValues = {
      attack: 8,
      defense: 3,
      focus: 5,
      critical_chance: 10,
      critical_damage: 152.5,
      faction: 'gangster'
    };
    
    console.log('\n🎯 VERIFICAÇÃO DOS VALORES:');
    console.log('Expected vs Actual:');
    console.log(`Ataque: ${expectedValues.attack} vs ${profile.attack} ${profile.attack === expectedValues.attack ? '✅' : '❌'}`);
    console.log(`Defesa: ${expectedValues.defense} vs ${profile.defense} ${profile.defense === expectedValues.defense ? '✅' : '❌'}`);
    console.log(`Foco: ${expectedValues.focus} vs ${profile.focus} ${profile.focus === expectedValues.focus ? '✅' : '❌'}`);
    console.log(`Chance Crítica: ${expectedValues.critical_chance}% vs ${profile.critical_chance}% ${profile.critical_chance === expectedValues.critical_chance ? '✅' : '❌'}`);
    console.log(`Dano Crítico: ${expectedValues.critical_damage} vs ${profile.critical_damage} ${profile.critical_damage === expectedValues.critical_damage ? '✅' : '❌'}`);
    console.log(`Facção: ${expectedValues.faction} vs ${profile.faction} ${profile.faction === expectedValues.faction ? '✅' : '❌'}`);
    
    // Verificar se todos os valores estão corretos
    const allCorrect = 
      profile.attack === expectedValues.attack &&
      profile.defense === expectedValues.defense &&
      profile.focus === expectedValues.focus &&
      profile.critical_chance === expectedValues.critical_chance &&
      profile.critical_damage === expectedValues.critical_damage &&
      profile.faction === expectedValues.faction;
    
    if (allCorrect) {
      console.log('\n🎉 SUCESSO: Todos os valores estão corretos!');
    } else {
      console.log('\n❌ ERRO: Alguns valores estão incorretos!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    // Limpar usuário de teste
    try {
      console.log('\n🧹 Limpando usuário de teste...');
      const testUser = {
        email: 'teste_gangster@test.com',
        username: 'teste_gangster',
        password: 'Test123!@#'
      };
      await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
      await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      console.log('✅ Usuário de teste removido');
    } catch (cleanupError) {
      console.error('❌ Erro ao limpar usuário de teste:', cleanupError.message);
    }
    
    await pool.end();
  }
}

testUserRegistration();