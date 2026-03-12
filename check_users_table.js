const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkData() {
  try {
    console.log('🔍 Verificando estrutura e dados das tabelas...');
    
    // Verificar estrutura da tabela users
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura da tabela users:');
    structureResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar tabela users
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total de usuários na tabela users: ${usersResult.rows[0].count}`);
    
    const usersData = await pool.query('SELECT * FROM users LIMIT 10');
    console.log('\n📊 Usuários na tabela users:');
    usersData.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Colunas disponíveis:`, Object.keys(user));
    });
    
    // Verificar dados na tabela user_profiles
    const profilesData = await pool.query(`
      SELECT 
        id,
        user_id,
        display_name,
        faction,
        attack,
        defense,
        focus,
        critical_chance,
        critical_damage
      FROM user_profiles
      LIMIT 10;
    `);
    
    console.log(`\n👥 Total de perfis na tabela user_profiles: ${profilesData.rows.length}`);
    if (profilesData.rows.length > 0) {
      console.log('\n📊 Perfis na tabela user_profiles:');
      profilesData.rows.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.display_name} (user_id: ${profile.user_id})`);
        console.log(`      Facção: ${profile.faction}`);
        console.log(`      Ataque: ${profile.attack}, Defesa: ${profile.defense}, Foco: ${profile.focus}`);
        console.log(`      Chance Crítica: ${profile.critical_chance}%, Dano Crítico: ${profile.critical_damage}`);
        
        // Verificar se os valores estão corretos para a facção
        if (profile.faction === 'gangsters') {
          const isCorrect = profile.attack === 8 && profile.defense === 3 && profile.focus === 5;
          console.log(`      ${isCorrect ? '✅' : '❌'} Valores ${isCorrect ? 'corretos' : 'incorretos'} para Gangster`);
        } else if (profile.faction === 'guardas') {
          const isCorrect = profile.attack === 5 && profile.defense === 6 && profile.focus === 6;
          console.log(`      ${isCorrect ? '✅' : '❌'} Valores ${isCorrect ? 'corretos' : 'incorretos'} para Guarda`);
        }
      });
    }
    
    // Verificar relação entre as tabelas
    const joinedData = await pool.query(`
      SELECT 
        u.email,
        u.username,
        up.display_name,
        up.faction,
        up.attack,
        up.defense,
        up.focus
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LIMIT 10;
    `);
    
    console.log(`\n🔗 Dados combinados (users + user_profiles): ${joinedData.rows.length}`);
    if (joinedData.rows.length > 0) {
      console.log('\n📊 Dados combinados:');
      joinedData.rows.forEach((data, index) => {
        console.log(`   ${index + 1}. ${data.email} - ${data.username}`);
        if (data.faction) {
          console.log(`      Display Name: ${data.display_name}`);
          console.log(`      Facção: ${data.faction}`);
          console.log(`      Stats: Ataque ${data.attack}, Defesa ${data.defense}, Foco ${data.focus}`);
        } else {
          console.log(`      ❌ Sem perfil criado`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();