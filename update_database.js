const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function updateDatabase() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Delete existing clans
    await pool.query('DELETE FROM clans');
    console.log('✅ Clãs antigos removidos');
    
    // Insert new clans with correct factions
    const insertQuery = `
      INSERT INTO clans (name, description, faction, max_members) VALUES
      ('Família Corleone', 'Clã tradicional focado em negócios e território', 'gangsters', 40),
      ('Cartel dos Irmãos', 'Especialistas em operações de alto risco', 'gangsters', 40),
      ('Máfia Siciliana', 'Veteranos com experiência em estratégias urbanas', 'gangsters', 40),
      ('Força Tática', 'Unidade de elite especializada em combate urbano', 'guardas', 40),
      ('Esquadrão Alpha', 'Operações especiais e missões de resgate', 'guardas', 40),
      ('Batalhão Central', 'Força principal de manutenção da ordem', 'guardas', 40)
    `;
    
    await pool.query(insertQuery);
    console.log('✅ Novos clãs inseridos com sucesso');
    
    // Update default max_members for future clans
    await pool.query('ALTER TABLE clans ALTER COLUMN max_members SET DEFAULT 40');
    console.log('✅ Limite padrão de membros atualizado para 40');
    
    // Verify the update
    const result = await pool.query('SELECT name, faction, max_members FROM clans ORDER BY faction, name');
    console.log('\n📋 Clãs atualizados:');
    result.rows.forEach(clan => {
      console.log(`- ${clan.name} (${clan.faction}) - Max: ${clan.max_members} membros`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  } finally {
    await pool.end();
    console.log('\n🔚 Conexão com banco de dados encerrada');
  }
}

updateDatabase();