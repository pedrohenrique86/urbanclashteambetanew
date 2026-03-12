const { Pool } = require('pg');
const fetch = require('node-fetch');

// Configuração do banco
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testClanFlow() {
  console.log('🔍 Testando fluxo completo de clã...');
  
  try {
    // 1. Buscar um usuário que já está em um clã
    const userQuery = `
      SELECT u.id, u.username, cm.clan_id 
      FROM users u 
      LEFT JOIN clan_members cm ON u.id = cm.user_id 
      WHERE u.username = 'canario'
      LIMIT 1
    `;
    
    const userResult = await pool.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário canario não encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Usuário encontrado:', {
      id: user.id,
      username: user.username,
      clan_id: user.clan_id
    });
    
    // 2. Testar a API de perfil diretamente
    console.log('\n📡 Testando API de perfil...');
    
    // Simular a consulta da API de perfil
    const profileQuery = `
      SELECT 
        p.*,
        u.username
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `;
    
    const profileResult = await pool.query(profileQuery, [user.id]);
    
    if (profileResult.rows.length === 0) {
      console.log('❌ Perfil não encontrado');
      return;
    }
    
    const profile = profileResult.rows[0];
    console.log('📊 Dados do perfil base:', {
      user_id: profile.user_id,
      faction: profile.faction,
      username: profile.username
    });
    
    // 3. Buscar clan_id separadamente (como faz a API)
    const clanQuery = `SELECT clan_id FROM clan_members WHERE user_id = $1`;
    const clanResult = await pool.query(clanQuery, [user.id]);
    
    const clan_id = clanResult.rows.length > 0 ? clanResult.rows[0].clan_id : null;
    
    console.log('🏰 Clan ID encontrado:', clan_id);
    
    // 4. Simular o objeto final que seria retornado pela API
    const finalProfile = {
      ...profile,
      clan_id: clan_id
    };
    
    console.log('\n✅ Perfil final que deveria ser retornado pela API:', {
      user_id: finalProfile.user_id,
      faction: finalProfile.faction,
      clan_id: finalProfile.clan_id,
      username: finalProfile.username
    });
    
    // 5. Verificar se o clan_id é válido
    if (clan_id) {
      const clanInfoQuery = `SELECT id, name FROM clans WHERE id = $1`;
      const clanInfoResult = await pool.query(clanInfoQuery, [clan_id]);
      
      if (clanInfoResult.rows.length > 0) {
        console.log('🏰 Informações do clã:', clanInfoResult.rows[0]);
      } else {
        console.log('❌ Clã não encontrado no banco!');
      }
    }
    
    console.log('\n🎯 CONCLUSÃO:');
    if (finalProfile.faction && finalProfile.clan_id) {
      console.log('✅ O usuário DEVERIA ir para o dashboard');
    } else if (finalProfile.faction && !finalProfile.clan_id) {
      console.log('⚠️ O usuário DEVERIA ir para seleção de clã');
    } else {
      console.log('⚠️ O usuário DEVERIA ir para seleção de facção');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testClanFlow();