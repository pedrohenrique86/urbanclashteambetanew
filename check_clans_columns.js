const { query } = require('./backend/config/database');

async function checkClansColumns() {
  try {
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clans' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela clans:');
    result.rows.forEach(row => {
      console.log('-', row.column_name);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkClansColumns();