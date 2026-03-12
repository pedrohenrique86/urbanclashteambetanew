const { query } = require('./backend/config/database');

async function checkUsersSimple() {
  try {
    // Verificar colunas da tabela users
    const columns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela users:');
    columns.rows.forEach(row => {
      console.log('-', row.column_name);
    });
    
    // Verificar dados
    const data = await query('SELECT COUNT(*) as count FROM users');
    console.log('Total de usuários:', data.rows[0].count);
    
    // Verificar usuários confirmados
    const confirmed = await query('SELECT COUNT(*) as count FROM users WHERE is_email_confirmed = true');
    console.log('Usuários confirmados:', confirmed.rows[0].count);
    
    // Mostrar um exemplo de dados
    const sample = await query('SELECT id, username, email, is_email_confirmed FROM users LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('Exemplo de dados:', sample.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkUsersSimple();