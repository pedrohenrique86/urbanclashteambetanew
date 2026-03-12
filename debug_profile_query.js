const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function debugProfileQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testando query de perfil diretamente...');
    
    // ID do usuário de teste
    const userId = '794233a8-cf6f-40ce-8d81-68346ab85f58';
    
    // Query exata que está sendo usada na API
    const result = await client.query(`
      SELECT 
        p.*,
        u.username
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [userId]);
    
    console.log('📊 Resultado da query:');
    console.log('Número de linhas:', result.rows.length);
    
    if (result.rows.length > 0) {
      const profile = result.rows[0];
      console.log('\n🔍 Campos retornados:');
      console.log('Username:', profile.username);
      console.log('User ID:', profile.user_id);
      console.log('Faction:', profile.faction);
      console.log('Level:', profile.level);
      
      console.log('\n📋 Todos os campos:');
      Object.keys(profile).forEach(key => {
        console.log(`${key}: ${profile[key]}`);
      });
    } else {
      console.log('❌ Nenhum perfil encontrado');
    }
    
    // Verificar se o usuário existe na tabela users
    const userCheck = await client.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
    console.log('\n👤 Verificação do usuário:');
    console.log('Usuário encontrado:', userCheck.rows.length > 0);
    if (userCheck.rows.length > 0) {
      console.log('Username na tabela users:', userCheck.rows[0].username);
      console.log('Email:', userCheck.rows[0].email);
    }
    
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugProfileQuery();