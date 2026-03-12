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

async function testPunisherCreation() {
  try {
    console.log('🧪 Testando criação de novo usuário Punisher...');
    
    // 1. Limpar usuário de teste se existir
    console.log('🧹 Limpando usuário de teste...');
    await pool.query('DELETE FROM user_profiles WHERE display_name = $1', ['test_punisher']);
    await pool.query('DELETE FROM users WHERE email = $1', ['test_punisher@test.com']);
    
    // 2. Criar usuário de teste
    console.log('👤 Criando usuário de teste...');
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const userId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, is_email_confirmed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [userId, 'test_punisher', 'test_punisher@test.com', hashedPassword]);
    
    // 3. Simular criação de perfil usando a mesma lógica da API
    console.log('⚔️ Criando perfil Punisher...');
    
    // Função getFactionStats simulada (mesma lógica corrigida)
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
        return {
          ...baseStats,
          attack: 8,
          defense: 3,
          focus: focus,
          intimidation: 0.00,
          discipline: 0.00,
          critical_chance: focus * 2,
    critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2)
        };
      } else if (faction === 'guardas') {
        const focus = 6;
        return {
          ...baseStats,
          attack: 5,
          defense: 6,
          focus: focus,
          intimidation: 0.00,
          discipline: 0.00,
          critical_chance: focus * 2,
      critical_damage: attack + (focus / 2) // Ataque + (Foco ÷ 2)
        };
      }
      
      // Valores padrão se facção não especificada
      return {
        ...baseStats,
        attack: 0,
        defense: 0,
        focus: 0,
        intimidation: 0.00,
        discipline: 0.00,
        critical_chance: 0.00,
        critical_damage: 150.00
      };
    }
    
    const factionStats = getFactionStats('gangsters');
    
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
      userId, 'test_punisher', 'gangsters', factionStats.level,
      factionStats.attack, factionStats.defense, factionStats.focus,
      factionStats.energy, factionStats.current_xp, factionStats.xp_required,
      factionStats.action_points, factionStats.money, factionStats.victories,
      factionStats.defeats, factionStats.winning_streak, factionStats.intimidation,
      factionStats.discipline, factionStats.critical_chance, factionStats.critical_damage
    ]);
    
    // 4. Verificar dados criados
    console.log('📊 Verificando dados criados...');
    const result = await pool.query(`
      SELECT 
        display_name, faction, attack, defense, focus,
        critical_chance, critical_damage
      FROM user_profiles 
      WHERE display_name = 'test_punisher'
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Usuário test_punisher criado com sucesso!');
      console.log(`   Facção: ${user.faction}`);
      console.log(`   Ataque: ${user.attack} (esperado: 8)`);
      console.log(`   Defesa: ${user.defense} (esperado: 3)`);
      console.log(`   Foco: ${user.focus} (esperado: 5)`);
      console.log(`   Chance Crítica: ${user.critical_chance}% (esperado: 10%)`);
      console.log(`   Dano Crítico: ${user.critical_damage} (esperado: 152.5)`);
      
      // Verificar se os valores estão corretos (convertendo para números)
      const isCorrect = (
        Number(user.attack) === 8 &&
        Number(user.defense) === 3 &&
        Number(user.focus) === 5 &&
        Number(user.critical_chance) === 10 &&
        Number(user.critical_damage) === 152.5
      );
      
      console.log('\n🔍 Debug dos tipos:');
      console.log(`   attack: ${user.attack} (tipo: ${typeof user.attack})`);
      console.log(`   defense: ${user.defense} (tipo: ${typeof user.defense})`);
      console.log(`   focus: ${user.focus} (tipo: ${typeof user.focus})`);
      console.log(`   critical_chance: ${user.critical_chance} (tipo: ${typeof user.critical_chance})`);
      console.log(`   critical_damage: ${user.critical_damage} (tipo: ${typeof user.critical_damage})`);
      
      if (isCorrect) {
        console.log('\n🎉 TESTE PASSOU! Novos usuários Punisher são criados com stats corretos!');
      } else {
        console.log('\n❌ TESTE FALHOU! Ainda há problemas na criação de usuários Punisher.');
      }
    } else {
      console.log('❌ Erro: Usuário test_punisher não foi encontrado!');
    }
    
    // 5. Limpeza final
    console.log('\n🧹 Limpeza final...');
    await pool.query('DELETE FROM user_profiles WHERE display_name = $1', ['test_punisher']);
    await pool.query('DELETE FROM users WHERE email = $1', ['test_punisher@test.com']);
    console.log('✅ Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testPunisherCreation();