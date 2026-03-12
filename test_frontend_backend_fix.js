const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'urbanclash',
  user: 'postgres',
  password: 'W0rdPr355@@'
});

async function testGangsterCreation() {
  try {
    await client.connect();
    console.log('🔗 Conectado ao banco de dados');
    
    const testUser = {
      user_id: 'test-gangster-' + Date.now(),
      faction: 'gangsters',
      username: 'TestGangster' + Date.now()
    };
    
    console.log('📝 Criando usuário de teste:', testUser);
    
    // Simular a criação como o backend faz
    const query = `
      INSERT INTO user_profiles (
        user_id, faction, username, display_name, level, current_xp, xp_required, 
        money, energy, max_energy, action_points, attack, defense, focus, 
        intimidation, discipline, victories, defeats, winning_streak, 
        critical_damage, critical_chance, last_action_points_reset, 
        created_at, updated_at
      )
      SELECT 
        $1, $2, $3, $3,
        stats.level, stats.current_xp, stats.xp_required, stats.money,
        stats.energy, stats.max_energy, stats.action_points, stats.attack,
        stats.defense, stats.focus, stats.intimidation, stats.discipline,
        stats.victories, stats.defeats, stats.winning_streak,
        stats.critical_damage, stats.critical_chance, NOW(), NOW(), NOW()
      FROM (
        SELECT 
          CASE WHEN $2 = 'gangsters' THEN 1 ELSE 1 END as level,
          CASE WHEN $2 = 'gangsters' THEN 0 ELSE 0 END as current_xp,
          CASE WHEN $2 = 'gangsters' THEN 100 ELSE 100 END as xp_required,
          CASE WHEN $2 = 'gangsters' THEN 1000 ELSE 1000 END as money,
          CASE WHEN $2 = 'gangsters' THEN 100 ELSE 100 END as energy,
          CASE WHEN $2 = 'gangsters' THEN 100 ELSE 100 END as max_energy,
          CASE WHEN $2 = 'gangsters' THEN 10 ELSE 10 END as action_points,
          CASE WHEN $2 = 'gangsters' THEN 8 ELSE 5 END as attack,
          CASE WHEN $2 = 'gangsters' THEN 3 ELSE 6 END as defense,
          CASE WHEN $2 = 'gangsters' THEN 5 ELSE 6 END as focus,
          CASE WHEN $2 = 'gangsters' THEN 35.0 ELSE 0.0 END as intimidation,
          CASE WHEN $2 = 'gangsters' THEN 0.0 ELSE 40.0 END as discipline,
          0 as victories,
          0 as defeats,
          0 as winning_streak,
          CASE WHEN $2 = 'gangsters' THEN 10.5 ELSE 8.0 END as critical_damage,
          CASE WHEN $2 = 'gangsters' THEN 10.0 ELSE 12.0 END as critical_chance
      ) as stats
      RETURNING *;
    `;
    
    const result = await client.query(query, [testUser.user_id, testUser.faction, testUser.username]);
    const createdUser = result.rows[0];
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('📊 Atributos do usuário:');
    console.log(`- Facção: ${createdUser.faction}`);
    console.log(`- Ataque: ${createdUser.attack} (esperado: 8)`);
    console.log(`- Defesa: ${createdUser.defense} (esperado: 3)`);
    console.log(`- Foco: ${createdUser.focus} (esperado: 5)`);
    console.log(`- Intimidação: ${createdUser.intimidation}% (esperado: 35%)`);
    console.log(`- Disciplina: ${createdUser.discipline}% (esperado: 0%)`);
    console.log(`- Dano Crítico: ${createdUser.critical_damage}% (esperado: 10.5%)`);
    console.log(`- Chance Crítica: ${createdUser.critical_chance}% (esperado: 10%)`);
    
    const isCorrect = 
      createdUser.attack === 8 && 
      createdUser.defense === 3 && 
      createdUser.focus === 5 && 
      createdUser.intimidation === 35.0 && 
      createdUser.discipline === 0.0;
    
    console.log(`\n${isCorrect ? '✅ SUCESSO' : '❌ ERRO'}: Atributos ${isCorrect ? 'corretos' : 'incorretos'}!`);
    
    // Limpar usuário de teste
    await client.query('DELETE FROM user_profiles WHERE user_id = $1', [testUser.user_id]);
    console.log('🗑️ Usuário de teste removido');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

testGangsterCreation();