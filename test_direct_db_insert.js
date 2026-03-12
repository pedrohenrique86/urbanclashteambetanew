const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testDirectDbInsert() {
  const testUser = {
    id: uuidv4(),
    email: 'teste_gangster_direct@test.com',
    username: 'teste_gangster_direct',
    password: 'Test123!@#'
  };

  try {
    // 1. Limpar usuário de teste existente
    console.log('🧹 Limpando usuário de teste existente...');
    await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    console.log('✅ Usuário de teste removido (se existia)');
    
    console.log('\n🧪 Testando inserção direta no banco...');
    
    // 2. Inserir usuário diretamente no banco
    console.log('📝 Inserindo usuário no banco...');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    
    await pool.query(
      'INSERT INTO users (id, email, username, password_hash, is_email_confirmed, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [testUser.id, testUser.email, testUser.username, hashedPassword, true, new Date()]
    );
    console.log('✅ Usuário inserido no banco');
    
    // 3. Inserir perfil com facção Gangster diretamente
    console.log('🎯 Inserindo perfil com facção Gangster...');
    
    // Valores esperados para Gangster baseados no código
    const gangsterStats = {
      attack: 8,
      defense: 3,
      focus: 5,
      critical_chance: 10,
      critical_damage: 10.5,
      faction: 'gangsters'
    };
    
    await pool.query(
      `INSERT INTO user_profiles (
        user_id, display_name, faction, attack, defense, focus, 
        critical_chance, critical_damage, level, experience_points, 
        money, energy, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        testUser.id,
        testUser.username,
        gangsterStats.faction,
        gangsterStats.attack,
        gangsterStats.defense,
        gangsterStats.focus,
        gangsterStats.critical_chance,
        gangsterStats.critical_damage,
        1, // level
        0, // experience_points
        1000, // money
        100, // energy
        new Date()
      ]
    );
    console.log('✅ Perfil inserido no banco');
    
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
    
    // 5. Verificar valores esperados para Gangster
    const expectedValues = {
      attack: 8,
      defense: 3,
      focus: 5,
      critical_chance: 10,
      critical_damage: 10.5,
      faction: 'gangsters'
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
      console.log('\n🔍 VALORES INCORRETOS DETECTADOS:');
      if (profile.attack !== expectedValues.attack) console.log(`   - Ataque: esperado ${expectedValues.attack}, atual ${profile.attack}`);
      if (profile.defense !== expectedValues.defense) console.log(`   - Defesa: esperado ${expectedValues.defense}, atual ${profile.defense}`);
      if (profile.focus !== expectedValues.focus) console.log(`   - Foco: esperado ${expectedValues.focus}, atual ${profile.focus}`);
      if (profile.critical_chance !== expectedValues.critical_chance) console.log(`   - Chance Crítica: esperado ${expectedValues.critical_chance}%, atual ${profile.critical_chance}%`);
      if (profile.critical_damage !== expectedValues.critical_damage) console.log(`   - Dano Crítico: esperado ${expectedValues.critical_damage}, atual ${profile.critical_damage}`);
      if (profile.faction !== expectedValues.faction) console.log(`   - Facção: esperado ${expectedValues.faction}, atual ${profile.faction}`);
    }
    
    // 6. Agora vamos testar via API para comparar
    console.log('\n🌐 TESTANDO VIA API PARA COMPARAÇÃO...');
    
    // Fazer login
    const axios = require('axios');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    const token = loginResponse.data.token;
    console.log('✅ Login via API realizado');
    
    // Criar novo perfil via API para comparar
    const testUser2 = {
      id: uuidv4(),
      email: 'teste_gangster_api@test.com',
      username: 'teste_gangster_api',
      password: 'Test123!@#'
    };
    
    // Inserir usuário 2 no banco
    const hashedPassword2 = await bcrypt.hash(testUser2.password, 10);
    await pool.query(
      'INSERT INTO users (id, email, username, password_hash, is_email_confirmed, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [testUser2.id, testUser2.email, testUser2.username, hashedPassword2, true, new Date()]
    );
    
    // Login com usuário 2
    const loginResponse2 = await axios.post('http://localhost:3001/api/auth/login', {
      email: testUser2.email,
      password: testUser2.password
    });
    const token2 = loginResponse2.data.token;
    
    // Criar perfil via API
    const apiProfileResponse = await axios.post('http://localhost:3001/api/users/profile', {
      faction: 'gangsters',
      username: testUser2.username
    }, {
      headers: {
        'Authorization': `Bearer ${token2}`
      }
    });
    
    console.log('✅ Perfil criado via API:', apiProfileResponse.data);
    
    // Verificar perfil criado via API
    const apiProfileQuery = 'SELECT * FROM user_profiles WHERE user_id = $1';
    const apiProfileResult = await pool.query(apiProfileQuery, [testUser2.id]);
    const apiProfile = apiProfileResult.rows[0];
    
    console.log('\n📊 COMPARAÇÃO: INSERÇÃO DIRETA vs API');
    console.log('Direto no banco vs Via API:');
    console.log(`Ataque: ${profile.attack} vs ${apiProfile.attack} ${profile.attack === apiProfile.attack ? '✅' : '❌'}`);
    console.log(`Defesa: ${profile.defense} vs ${apiProfile.defense} ${profile.defense === apiProfile.defense ? '✅' : '❌'}`);
    console.log(`Foco: ${profile.focus} vs ${apiProfile.focus} ${profile.focus === apiProfile.focus ? '✅' : '❌'}`);
    console.log(`Chance Crítica: ${profile.critical_chance}% vs ${apiProfile.critical_chance}% ${profile.critical_chance === apiProfile.critical_chance ? '✅' : '❌'}`);
    console.log(`Dano Crítico: ${profile.critical_damage} vs ${apiProfile.critical_damage} ${profile.critical_damage === apiProfile.critical_damage ? '✅' : '❌'}`);
    console.log(`Facção: ${profile.faction} vs ${apiProfile.faction} ${profile.faction === apiProfile.faction ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    // Limpar usuários de teste
    try {
      console.log('\n🧹 Limpando usuários de teste...');
      await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['teste_gangster_%@test.com']);
      await pool.query('DELETE FROM users WHERE email LIKE $1', ['teste_gangster_%@test.com']);
      console.log('✅ Usuários de teste removidos');
    } catch (cleanupError) {
      console.error('❌ Erro ao limpar usuários de teste:', cleanupError.message);
    }
    
    await pool.end();
  }
}

testDirectDbInsert();