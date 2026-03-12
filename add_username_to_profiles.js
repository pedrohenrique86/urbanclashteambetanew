const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function addUsernameToProfiles() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adicionando coluna username na tabela user_profiles...');
    
    // Verificar se a coluna já existe
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'username'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('⚠️  Coluna username já existe na tabela user_profiles');
    } else {
      // Adicionar a coluna username
      await client.query(`
        ALTER TABLE user_profiles 
        ADD COLUMN username VARCHAR(50)
      `);
      console.log('✅ Coluna username adicionada à tabela user_profiles');
    }
    
    // Sincronizar usernames da tabela users para user_profiles
    console.log('🔄 Sincronizando usernames da tabela users...');
    
    const updateResult = await client.query(`
      UPDATE user_profiles 
      SET username = u.username
      FROM users u 
      WHERE user_profiles.user_id = u.id
    `);
    
    console.log(`✅ ${updateResult.rowCount} perfis atualizados com username`);
    
    // Verificar os resultados
    const verificationResult = await client.query(`
      SELECT 
        p.user_id,
        p.username as profile_username,
        u.username as user_username,
        u.email
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      LIMIT 5
    `);
    
    console.log('\n📊 Verificação dos dados sincronizados:');
    verificationResult.rows.forEach(row => {
      console.log(`Email: ${row.email}`);
      console.log(`Username na tabela users: ${row.user_username}`);
      console.log(`Username na tabela user_profiles: ${row.profile_username}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar username à tabela user_profiles:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addUsernameToProfiles();