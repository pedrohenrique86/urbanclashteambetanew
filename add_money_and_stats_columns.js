const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function addMoneyAndStatsColumns() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'add_money_and_stats_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar as alterações
    console.log('📊 Adicionando colunas money, victories, defeats e winning_streak...');
    await pool.query(sqlContent);
    
    // Verificar a estrutura da tabela
    console.log('\n🔍 Verificando estrutura da tabela user_profiles:');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name IN ('money', 'victories', 'defeats', 'winning_streak', 'action_points', 'current_xp')
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Colunas adicionadas/verificadas:');
    tableInfo.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
    });
    
    // Mostrar alguns exemplos de dados
    console.log('\n👥 Exemplos de perfis atualizados:');
    const sampleData = await pool.query(`
      SELECT 
        display_name,
        faction,
        money,
        victories,
        defeats,
        winning_streak,
        action_points,
        current_xp
      FROM user_profiles 
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    sampleData.rows.forEach(profile => {
      console.log(`\n📊 ${profile.display_name} (${profile.faction || 'sem facção'})`);
      console.log(`   💰 Dinheiro: ${profile.money?.toLocaleString('pt-BR') || '0'}`);
      console.log(`   🏆 Vitórias: ${profile.victories || 0}`);
      console.log(`   💀 Derrotas: ${profile.defeats || 0}`);
      console.log(`   🔥 Sequência de Vitórias: ${profile.winning_streak || 0}`);
      console.log(`   ⚡ Pontos de Ação: ${profile.action_points?.toLocaleString('pt-BR') || '0'}`);
      console.log(`   ⭐ XP Atual: ${profile.current_xp || 0}`);
    });
    
    console.log('\n✅ Colunas adicionadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error.message);
  } finally {
    await pool.end();
  }
}

addMoneyAndStatsColumns();