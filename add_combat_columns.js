const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

async function addCombatColumns() {
  try {
    console.log('🔧 Adicionando novas colunas de combate à tabela user_profiles...');
    
    // Adicionar as novas colunas
    const alterTableQuery = `
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS xp_required INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS action_points INTEGER DEFAULT 20000,
      ADD COLUMN IF NOT EXISTS attack INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS focus INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS intimidation DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discipline DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS critical_damage DECIMAL(5,2) DEFAULT 150.00,
      ADD COLUMN IF NOT EXISTS critical_chance DECIMAL(5,2) DEFAULT 10.00,
      ADD COLUMN IF NOT EXISTS action_points_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `;
    
    await pool.query(alterTableQuery);
    console.log('✅ Colunas adicionadas com sucesso!');
    
    // Verificar a estrutura atualizada
    const checkColumns = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name IN (
        'energy', 'current_xp', 'xp_required', 'action_points', 
        'attack', 'defense', 'focus', 'intimidation', 
        'discipline', 'critical_damage', 'critical_chance', 
        'action_points_reset_time'
      )
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Novas colunas criadas:');
    checkColumns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) - Default: ${row.column_default || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error.message);
  } finally {
    pool.end();
  }
}

addCombatColumns();