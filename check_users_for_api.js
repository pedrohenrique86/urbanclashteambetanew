const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários na tabela users...');

    // Verificar usuários existentes
    const result = await pool.query(`
      SELECT 
        id, email, password_hash
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📋 Usuários encontrados (${result.rows.length} registros):`);
    result.rows.forEach((row, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Tem senha: ${row.password_hash ? 'SIM' : 'NÃO'}`);
    });

    // Verificar se há correspondência entre users e user_profiles
    const joinResult = await pool.query(`
      SELECT 
        u.id as user_id, u.email, 
        up.faction, up.attack, up.critical_damage
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY u.created_at DESC
      LIMIT 3
    `);

    console.log(`\n🔗 Relação users <-> user_profiles:`);
    joinResult.rows.forEach((row, index) => {
      console.log(`\n🔗 Relação ${index + 1}:`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Tem perfil: ${row.faction ? 'SIM' : 'NÃO'}`);
      if (row.faction) {
        console.log(`   Facção: ${row.faction}`);
        console.log(`   Ataque: ${row.attack}`);
        console.log(`   Dano Crítico: ${row.critical_damage}`);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();