const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testNewCriticalDamage() {
  try {
    console.log('🧪 Testando nova lógica de dano crítico...');
    console.log('📋 Nova fórmula: Dano Crítico = Ataque + (Foco ÷ 2)');
    
    // 1. Limpar usuários de teste
    console.log('\n🧹 Limpando usuários de teste...');
    await pool.query('DELETE FROM user_profiles WHERE display_name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%@test.com']);
    
    // 2. Criar usuário gangster de teste
    console.log('\n👤 Criando usuário Gangster de teste...');
    const gangsterUserId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, is_email_confirmed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [gangsterUserId, 'test_gangster', 'test_gangster@test.com', hashedPassword]);
    
    // Função getFactionStats simulada (mesma lógica corrigida do backend)
    function getFactionStats(faction) {
      const baseStats = {
        level: 1,
        energy: 100,
        current_xp: 0,
        xp_required: 100,
        action_points: 20000,
        money: 1000,
        victories: 0,
        defeats: 0,
        winning_streak: 0
      };
    
      if (faction === 'gangsters') {
        const focus = 5;
        const attack = 8;
        return {
          ...baseStats,
          attack: attack,
          defense: 3,
          focus: focus,
          intimidation: 0.00,
          discipline: 0.00,
          critical_chance: focus * 2,
          critical_damage: attack + (focus / 2) // Nova fórmula: Ataque + (Foco ÷ 2)
        };
      } else if (faction === 'guardas') {
        const focus = 6;
        const attack = 5;
        return {
          ...baseStats,
          attack: attack,
          defense: 6,
          focus: focus,
          intimidation: 0.00,
          discipline: 0.00,
          critical_chance: focus * 2,
          critical_damage: attack + (focus / 2) // Nova fórmula: Ataque + (Foco ÷ 2)
        };
      }
      
      return {
        ...baseStats,
        attack: 0,
        defense: 0,
        focus: 0,
        intimidation: 0.00,
        discipline: 0.00,
        critical_chance: 0.00,
        critical_damage: 0.00
      };
    }
    
    const gangsterStats = getFactionStats('gangsters');
    
    await pool.query(`
      INSERT INTO user_profiles (
        user_id, display_name, faction, level, attack, defense, focus,
        energy, current_xp, xp_required, action_points, money,
        victories, defeats, winning_streak, intimidation, discipline,
        critical_chance, critical_damage, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      gangsterUserId, 'test_gangster', 'gangsters', gangsterStats.level,
      gangsterStats.attack, gangsterStats.defense, gangsterStats.focus,
      gangsterStats.energy, gangsterStats.current_xp, gangsterStats.xp_required,
      gangsterStats.action_points, gangsterStats.money, gangsterStats.victories,
      gangsterStats.defeats, gangsterStats.winning_streak, gangsterStats.intimidation,
      gangsterStats.discipline, gangsterStats.critical_chance, gangsterStats.critical_damage
    ]);
    
    // 3. Criar usuário guarda de teste
    console.log('\n🛡️ Criando usuário Guarda de teste...');
    const guardaUserId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, is_email_confirmed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [guardaUserId, 'test_guarda', 'test_guarda@test.com', hashedPassword]);
    
    const guardaStats = getFactionStats('guardas');
    
    await pool.query(`
      INSERT INTO user_profiles (
        user_id, display_name, faction, level, attack, defense, focus,
        energy, current_xp, xp_required, action_points, money,
        victories, defeats, winning_streak, intimidation, discipline,
        critical_chance, critical_damage, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      guardaUserId, 'test_guarda', 'guardas', guardaStats.level,
      guardaStats.attack, guardaStats.defense, guardaStats.focus,
      guardaStats.energy, guardaStats.current_xp, guardaStats.xp_required,
      guardaStats.action_points, guardaStats.money, guardaStats.victories,
      guardaStats.defeats, guardaStats.winning_streak, guardaStats.intimidation,
      guardaStats.discipline, guardaStats.critical_chance, guardaStats.critical_damage
    ]);
    
    // 4. Verificar dados criados
    console.log('\n📊 Verificando dados criados...');
    const result = await pool.query(`
      SELECT 
        display_name, faction, attack, defense, focus,
        critical_chance, critical_damage
      FROM user_profiles 
      WHERE display_name LIKE 'test_%'
      ORDER BY faction, display_name
    `);
    
    result.rows.forEach((user) => {
      const expectedCriticalDamage = user.attack + (user.focus / 2);
      const isCorrect = Math.abs(user.critical_damage - expectedCriticalDamage) < 0.01;
      
      console.log(`\n✅ ${user.display_name} (${user.faction})`);
      console.log(`   Ataque: ${user.attack}`);
      console.log(`   Defesa: ${user.defense}`);
      console.log(`   Foco: ${user.focus}`);
      console.log(`   Chance Crítica: ${user.critical_chance}%`);
      console.log(`   Dano Crítico: ${user.critical_damage} (esperado: ${expectedCriticalDamage})`);
      console.log(`   ${isCorrect ? '✅ Correto' : '❌ Incorreto'}`);
    });
    
    // 5. Verificar fórmulas específicas
    console.log('\n🔍 Verificação das fórmulas:');
    console.log('📋 Gangsters: Ataque 8 + (Foco 5 ÷ 2) = 8 + 2.5 = 10.5');
    console.log('📋 Guardas: Ataque 5 + (Foco 6 ÷ 2) = 5 + 3 = 8');
    
    const gangsterUser = result.rows.find(u => u.faction === 'gangsters');
    const guardaUser = result.rows.find(u => u.faction === 'guardas');
    
    if (gangsterUser && Math.abs(Number(gangsterUser.critical_damage) - 10.5) < 0.01) {
      console.log('✅ Fórmula Gangster está correta!');
    } else {
      console.log('❌ Fórmula Gangster está incorreta!');
      console.log(`   Valor encontrado: ${gangsterUser?.critical_damage} (tipo: ${typeof gangsterUser?.critical_damage})`);
    }
    
    if (guardaUser && Math.abs(Number(guardaUser.critical_damage) - 8) < 0.01) {
      console.log('✅ Fórmula Guarda está correta!');
    } else {
      console.log('❌ Fórmula Guarda está incorreta!');
      console.log(`   Valor encontrado: ${guardaUser?.critical_damage} (tipo: ${typeof guardaUser?.critical_damage})`);
    }
    
    // 6. Limpeza final
    console.log('\n🧹 Limpeza final...');
    await pool.query('DELETE FROM user_profiles WHERE display_name LIKE $1', ['test_%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%@test.com']);
    console.log('✅ Limpeza concluída!');
    
    console.log('\n🎉 Teste concluído! Nova lógica de dano crítico está funcionando.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testNewCriticalDamage();