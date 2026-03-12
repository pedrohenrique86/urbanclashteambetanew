const { query } = require('./config/database');

async function checkTables() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');
    const usersStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Estrutura da tabela users:');
    console.table(usersStructure.rows);

    console.log('\n🔍 Verificando estrutura da tabela user_profiles...');
    const profilesStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Estrutura da tabela user_profiles:');
    console.table(profilesStructure.rows);

    console.log('\n🔍 Verificando estrutura da tabela clans...');
    const clansStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clans'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Estrutura da tabela clans:');
    console.table(clansStructure.rows);

    console.log('\n🔍 Verificando se existe tabela clan_members...');
    const clanMembersCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'clan_members';
    `);
    if (clanMembersCheck.rows.length > 0) {
      console.log('✅ Tabela clan_members encontrada!');
      const clanMembersStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'clan_members'
        ORDER BY ordinal_position;
      `);
      console.log('📋 Estrutura da tabela clan_members:');
      console.table(clanMembersStructure.rows);
    } else {
      console.log('❌ Tabela clan_members não encontrada.');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();