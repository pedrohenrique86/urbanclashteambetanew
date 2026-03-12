const { query } = require('./backend/config/database');

async function checkClanMembers() {
  try {
    // Verificar se a tabela existe
    const tableExists = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'clan_members'
    `);
    
    console.log('Tabela clan_members existe:', tableExists.rows.length > 0);
    
    if (tableExists.rows.length > 0) {
      // Verificar colunas
      const columns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clan_members'
      `);
      
      console.log('Colunas da tabela clan_members:');
      columns.rows.forEach(row => {
        console.log('-', row.column_name);
      });
      
      // Verificar dados
      const data = await query('SELECT COUNT(*) as count FROM clan_members');
      console.log('Total de membros:', data.rows[0].count);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkClanMembers();