const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function createUsernameSyncTrigger() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Criando trigger para sincronização automática de username...');
    
    // Criar função do trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_username_to_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Atualizar username no user_profiles quando username for alterado na tabela users
        IF TG_OP = 'UPDATE' AND OLD.username IS DISTINCT FROM NEW.username THEN
          UPDATE user_profiles 
          SET username = NEW.username 
          WHERE user_id = NEW.id;
        END IF;
        
        -- Para INSERT, sincronizar username se já existir um perfil
        IF TG_OP = 'INSERT' THEN
          UPDATE user_profiles 
          SET username = NEW.username 
          WHERE user_id = NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Função do trigger criada');
    
    // Remover trigger existente se houver
    await client.query(`
      DROP TRIGGER IF EXISTS sync_username_trigger ON users;
    `);
    
    // Criar o trigger
    await client.query(`
      CREATE TRIGGER sync_username_trigger
      AFTER INSERT OR UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_username_to_profile();
    `);
    
    console.log('✅ Trigger de sincronização criado');
    
    // Testar o trigger
    console.log('🧪 Testando o trigger...');
    
    // Criar um usuário de teste temporário
    const testResult = await client.query(`
      INSERT INTO users (email, username, password_hash, is_email_confirmed, birth_date, country)
      VALUES ('trigger_test@test.com', 'triggertest', 'hash123', true, '1990-01-01', 'BR')
      RETURNING id, username
    `);
    
    const testUserId = testResult.rows[0].id;
    const testUsername = testResult.rows[0].username;
    
    // Criar perfil para o usuário de teste
    await client.query(`
      INSERT INTO user_profiles (
        user_id, faction, level, experience_points,
        energy, current_xp, xp_required, action_points,
        attack, defense, focus, intimidation, discipline,
        critical_chance, critical_damage, money, money_daily_gain, victories, defeats, winning_streak,
        action_points_reset_time
      )
      VALUES ($1, 'gangsters', 1, 0, 100, 0, 100, 10, 10, 10, 10, 1.0, 1.0, 5.0, 150.0, 1000, 50, 0, 0, 0, CURRENT_TIMESTAMP)
    `, [testUserId]);
    
    // Verificar se o username foi sincronizado
    const syncCheck = await client.query(`
      SELECT username FROM user_profiles WHERE user_id = $1
    `, [testUserId]);
    
    if (syncCheck.rows[0].username === testUsername) {
      console.log('✅ Trigger funcionando corretamente - username sincronizado automaticamente');
    } else {
      console.log('❌ Trigger não funcionou - username não foi sincronizado');
    }
    
    // Testar atualização
    await client.query(`
      UPDATE users SET username = 'triggertest_updated' WHERE id = $1
    `, [testUserId]);
    
    const updateCheck = await client.query(`
      SELECT username FROM user_profiles WHERE user_id = $1
    `, [testUserId]);
    
    if (updateCheck.rows[0].username === 'triggertest_updated') {
      console.log('✅ Trigger de UPDATE funcionando corretamente');
    } else {
      console.log('❌ Trigger de UPDATE não funcionou');
    }
    
    // Limpar dados de teste
    await client.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('🧹 Dados de teste removidos');
    
  } catch (error) {
    console.error('❌ Erro ao criar trigger:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createUsernameSyncTrigger();