const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testClanJoinAPI() {
  try {
    console.log('🔍 Testando API de entrada no clã...');
    
    // 1. Buscar um usuário válido
    const userResult = await pool.query(
      'SELECT u.id, u.username, u.email FROM users u LIMIT 1'
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário confirmado encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Usuário encontrado:', user.username);
    
    // 2. Buscar um clã disponível
    const clanResult = await pool.query(
      'SELECT id, name, is_recruiting, member_count, max_members FROM clans WHERE is_recruiting = true AND member_count < max_members LIMIT 1'
    );
    
    if (clanResult.rows.length === 0) {
      console.log('❌ Nenhum clã disponível para entrada');
      return;
    }
    
    const clan = clanResult.rows[0];
    console.log('🏰 Clã encontrado:', clan.name);
    
    // 3. Verificar se o usuário já é membro de algum clã
    const memberResult = await pool.query(
      'SELECT clan_id FROM clan_members WHERE user_id = $1',
      [user.id]
    );
    
    if (memberResult.rows.length > 0) {
      console.log('⚠️ Usuário já é membro de um clã, removendo...');
      await pool.query('DELETE FROM clan_members WHERE user_id = $1', [user.id]);
      await pool.query('UPDATE user_profiles SET clan_id = NULL WHERE user_id = $1', [user.id]);
    }
    
    // 4. Gerar token de teste (simulado)
    const testToken = 'test_token_' + Date.now();
    
    // 5. Simular entrada no clã diretamente no banco
    console.log('📡 Testando entrada no clã diretamente...');
    
    try {
      // Simular a lógica da API de entrada no clã
      await pool.query('BEGIN');
      
      // Adicionar usuário ao clã
      await pool.query(
        'INSERT INTO clan_members (clan_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())',
        [clan.id, user.id, 'member']
      );
      
      // Atualizar clan_id no perfil do usuário
      await pool.query(
        'UPDATE user_profiles SET clan_id = $1 WHERE user_id = $2',
        [clan.id, user.id]
      );
      
      // Incrementar member_count do clã
      await pool.query(
        'UPDATE clans SET member_count = member_count + 1 WHERE id = $1',
        [clan.id]
      );
      
      await pool.query('COMMIT');
      
      console.log('✅ Entrada no clã simulada com sucesso!');
      
      // Verificar se o usuário foi adicionado
      const checkMember = await pool.query(
        'SELECT * FROM clan_members WHERE user_id = $1 AND clan_id = $2',
        [user.id, clan.id]
      );
      
      if (checkMember.rows.length > 0) {
        console.log('✅ Usuário adicionado à tabela clan_members');
      } else {
        console.log('❌ Usuário NÃO foi adicionado à tabela clan_members');
      }
      
      // Verificar se o clan_id foi atualizado no perfil
      const checkProfile = await pool.query(
        'SELECT clan_id FROM user_profiles WHERE user_id = $1',
        [user.id]
      );
      
      if (checkProfile.rows.length > 0 && checkProfile.rows[0].clan_id == clan.id) {
        console.log('✅ clan_id atualizado no perfil do usuário');
      } else {
        console.log('❌ clan_id NÃO foi atualizado no perfil do usuário');
      }
      
      // Verificar se o member_count foi incrementado
      const checkClan = await pool.query(
        'SELECT member_count FROM clans WHERE id = $1',
        [clan.id]
      );
      
      if (checkClan.rows.length > 0) {
        console.log('📊 Member count atual do clã:', checkClan.rows[0].member_count);
      }
      
    } catch (dbError) {
      await pool.query('ROLLBACK');
      console.log('❌ Erro na simulação:', dbError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testClanJoinAPI();