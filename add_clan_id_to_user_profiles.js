const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function addClanIdColumn() {
  try {
    console.log('🔍 Verificando se a coluna clan_id existe na tabela user_profiles...');
    
    // Verificar se a coluna já existe
    const columnCheck = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'clan_id'"
    );
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ A coluna clan_id já existe na tabela user_profiles');
      return;
    }
    
    console.log('➕ Adicionando coluna clan_id na tabela user_profiles...');
    
    // Adicionar a coluna clan_id
    await pool.query(
      'ALTER TABLE user_profiles ADD COLUMN clan_id UUID REFERENCES clans(id) ON DELETE SET NULL'
    );
    
    console.log('✅ Coluna clan_id adicionada com sucesso!');
    
    // Verificar se há membros de clã que precisam ter o clan_id atualizado
    console.log('🔄 Sincronizando dados existentes...');
    
    const updateResult = await pool.query(`
      UPDATE user_profiles 
      SET clan_id = cm.clan_id 
      FROM clan_members cm 
      WHERE user_profiles.user_id = cm.user_id
    `);
    
    console.log(`✅ ${updateResult.rowCount} perfis atualizados com clan_id`);
    
    // Verificar o resultado
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_profiles WHERE clan_id IS NOT NULL'
    );
    
    console.log(`📊 Total de perfis com clan_id: ${verifyResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

addClanIdColumn();