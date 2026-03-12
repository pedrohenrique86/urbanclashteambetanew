const axios = require('axios');
const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

const API_BASE_URL = 'http://localhost:3002/api';

async function testNewGangsterRegistration() {
  const testEmail = `test_gangster_${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `TestGangster${Date.now()}`;
  
  try {
    console.log('🧪 Testando registro de novo usuário Gangster...');
    console.log(`📧 Email de teste: ${testEmail}`);
    console.log(`👤 Username: ${testUsername}`);
    
    // 1. Registrar novo usuário
    console.log('\n🔐 Registrando usuário...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      username: testUsername
    });
    
    if (registerResponse.status === 201) {
      console.log('✅ Usuário registrado com sucesso!');
      console.log('Response:', registerResponse.data);
      
      // 2. Fazer login
      console.log('\n🔑 Fazendo login...');
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testEmail,
        password: testPassword
      });
      
      if (loginResponse.status === 200) {
        const { token } = loginResponse.data;
        console.log('✅ Login realizado com sucesso!');
        
        // 3. Selecionar facção Gangster
        console.log('\n⚔️ Selecionando facção Gangster...');
        const factionResponse = await axios.post(`${API_BASE_URL}/users/faction`, {
          faction: 'gangsters'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (factionResponse.status === 200) {
          console.log('✅ Facção selecionada com sucesso!');
          console.log('Response:', factionResponse.data);
          
          // 4. Obter perfil do usuário
          console.log('\n📊 Obtendo perfil do usuário...');
          const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (profileResponse.status === 200) {
            const profile = profileResponse.data;
            console.log('✅ Perfil obtido com sucesso!');
            
            console.log('\n📈 Estatísticas do novo usuário Gangster:');
            console.log(`   ⚔️ Ataque: ${profile.attack} (esperado: 8)`);
            console.log(`   🛡️ Defesa: ${profile.defense} (esperado: 3)`);
            console.log(`   🎯 Foco: ${profile.focus} (esperado: 5)`);
            console.log(`   💥 Chance Crítica: ${profile.critical_chance}% (esperado: 10%)`);
            console.log(`   ⚡ Dano Crítico: ${profile.critical_damage} (esperado: 152.5)`);
            
            // Verificar se os valores estão corretos
            const isCorrect = (
              profile.attack === 8 &&
              profile.defense === 3 &&
              profile.focus === 5 &&
              profile.critical_chance === 10 &&
              profile.critical_damage === 152.5
            );
            
            if (isCorrect) {
              console.log('\n🎉 ✅ TESTE PASSOU! Valores estão corretos!');
            } else {
              console.log('\n❌ TESTE FALHOU! Valores estão incorretos!');
              console.log('\n🔍 Valores esperados vs recebidos:');
              console.log(`   Ataque: ${profile.attack} vs 8`);
              console.log(`   Defesa: ${profile.defense} vs 3`);
              console.log(`   Foco: ${profile.focus} vs 5`);
              console.log(`   Chance Crítica: ${profile.critical_chance} vs 10`);
              console.log(`   Dano Crítico: ${profile.critical_damage} vs 152.5`);
            }
            
            // Verificar no banco de dados diretamente
            console.log('\n🔍 Verificando no banco de dados...');
            const dbCheck = await pool.query(`
              SELECT 
                up.display_name,
                up.faction,
                up.attack,
                up.defense,
                up.focus,
                up.critical_chance,
                up.critical_damage
              FROM user_profiles up
              JOIN users u ON u.id = up.user_id
              WHERE u.email = $1
            `, [testEmail]);
            
            if (dbCheck.rows.length > 0) {
              const dbProfile = dbCheck.rows[0];
              console.log('📊 Dados no banco:');
              console.log(`   Nome: ${dbProfile.display_name}`);
              console.log(`   Facção: ${dbProfile.faction}`);
              console.log(`   Ataque: ${dbProfile.attack}`);
              console.log(`   Defesa: ${dbProfile.defense}`);
              console.log(`   Foco: ${dbProfile.focus}`);
              console.log(`   Chance Crítica: ${dbProfile.critical_chance}%`);
              console.log(`   Dano Crítico: ${dbProfile.critical_damage}`);
            }
            
          } else {
            console.log('❌ Erro ao obter perfil:', profileResponse.status, profileResponse.data);
          }
        } else {
          console.log('❌ Erro ao selecionar facção:', factionResponse.status, factionResponse.data);
        }
      } else {
        console.log('❌ Erro no login:', loginResponse.status, loginResponse.data);
      }
    } else {
      console.log('❌ Erro no registro:', registerResponse.status, registerResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  } finally {
    // Limpar usuário de teste
    try {
      console.log('\n🧹 Limpando usuário de teste...');
      await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testEmail]);
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
      console.log('✅ Usuário de teste removido!');
    } catch (cleanupError) {
      console.log('⚠️ Erro ao limpar usuário de teste:', cleanupError.message);
    }
    
    await pool.end();
  }
}

testNewGangsterRegistration();