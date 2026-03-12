const { query } = require('./backend/config/database');

// Teste direto no banco de dados
async function testClanJoinInDatabase() {
  console.log('🧪 Testando entrada no clã diretamente no banco...');
  
  try {
    // 1. Verificar se existe algum usuário com facção
    console.log('\n1. Buscando usuário com facção...');
    const userResult = await query(`
      SELECT u.id, u.email, p.faction, p.username
      FROM users u
      JOIN user_profiles p ON u.id = p.user_id
      WHERE p.faction IS NOT NULL
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário com facção encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Usuário encontrado: ${user.email} (${user.username}) - Facção: ${user.faction}`);
    
    // 2. Verificar se existe algum clã da mesma facção
    console.log('\n2. Buscando clã disponível...');
    const clanResult = await query(`
      SELECT id, name, faction, is_recruiting, member_count, max_members
      FROM clans
      WHERE faction = $1 AND is_recruiting = true
      LIMIT 1
    `, [user.faction]);
    
    if (clanResult.rows.length === 0) {
      console.log('❌ Nenhum clã disponível para esta facção');
      return;
    }
    
    const clan = clanResult.rows[0];
    console.log(`✅ Clã encontrado: ${clan.name} (ID: ${clan.id})`);
    
    // 3. Verificar se o usuário já é membro de algum clã
    console.log('\n3. Verificando se usuário já é membro de algum clã...');
    const existingMemberResult = await query(`
      SELECT clan_id FROM clan_members WHERE user_id = $1
    `, [user.id]);
    
    if (existingMemberResult.rows.length > 0) {
      console.log(`⚠️ Usuário já é membro do clã ID: ${existingMemberResult.rows[0].clan_id}`);
      
      // Remover do clã atual para testar
      console.log('\n4. Removendo do clã atual para testar...');
      await query(`
        DELETE FROM clan_members WHERE user_id = $1
      `, [user.id]);
      console.log('✅ Usuário removido do clã');
    }
    
    // 4. Adicionar usuário ao clã
    console.log('\n5. Adicionando usuário ao clã...');
    await query(`
      INSERT INTO clan_members (clan_id, user_id, role)
      VALUES ($1, $2, 'member')
    `, [clan.id, user.id]);
    console.log('✅ Usuário adicionado ao clã');
    
    // 5. Verificar se foi adicionado corretamente
    console.log('\n6. Verificando se foi adicionado corretamente...');
    const verifyResult = await query(`
      SELECT clan_id FROM clan_members WHERE user_id = $1
    `, [user.id]);
    
    if (verifyResult.rows.length > 0) {
      console.log(`✅ SUCESSO: Usuário agora é membro do clã ID: ${verifyResult.rows[0].clan_id}`);
    } else {
      console.log('❌ PROBLEMA: Usuário não foi adicionado ao clã');
    }
    
    // 6. Testar a consulta da API de perfil
    console.log('\n7. Testando consulta da API de perfil...');
    const profileResult = await query(`
      SELECT 
        p.*,
        u.username
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [user.id]);
    
    const clanMemberResult = await query(`
      SELECT clan_id FROM clan_members WHERE user_id = $1
    `, [user.id]);
    
    const profile = profileResult.rows[0];
    const clanMembership = clanMemberResult.rows[0];
    
    console.log('📋 Dados do perfil:');
    console.log('  - Username:', profile.username);
    console.log('  - Facção:', profile.faction);
    console.log('  - Clan ID (da consulta):', clanMembership ? clanMembership.clan_id : null);
    
    if (clanMembership && clanMembership.clan_id) {
      console.log('\n✅ TUDO FUNCIONANDO: A API deveria retornar o clan_id corretamente!');
    } else {
      console.log('\n❌ PROBLEMA: A consulta não está retornando o clan_id');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar o teste
testClanJoinInDatabase();