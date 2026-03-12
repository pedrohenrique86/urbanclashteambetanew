const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function updateCriticalDamage() {
  try {
    console.log('🔧 Atualizando valores de critical_damage com nova fórmula...');
    console.log('📋 Nova fórmula: Dano Crítico = Ataque + (Foco ÷ 2)');
    
    // Buscar todos os usuários
    const users = await pool.query(`
      SELECT 
        id, display_name, faction, attack, focus, critical_damage
      FROM user_profiles 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📊 Encontrados ${users.rows.length} usuários para atualizar:`);
    
    for (const user of users.rows) {
      const oldCriticalDamage = user.critical_damage;
      const newCriticalDamage = user.attack + (user.focus / 2);
      
      console.log(`\n👤 ${user.display_name} (${user.faction})`);
      console.log(`   Ataque: ${user.attack}, Foco: ${user.focus}`);
      console.log(`   Dano Crítico Antigo: ${oldCriticalDamage}`);
      console.log(`   Dano Crítico Novo: ${newCriticalDamage}`);
      
      // Atualizar o valor no banco
      await pool.query(`
        UPDATE user_profiles 
        SET critical_damage = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newCriticalDamage, user.id]);
      
      console.log(`   ✅ Atualizado!`);
    }
    
    // Verificação final
    console.log('\n🔍 Verificação final - Todos os usuários:');
    const finalCheck = await pool.query(`
      SELECT 
        display_name, faction, attack, focus, critical_damage
      FROM user_profiles 
      ORDER BY faction, display_name
    `);
    
    finalCheck.rows.forEach((user, index) => {
      const expectedCriticalDamage = user.attack + (user.focus / 2);
      const isCorrect = Math.abs(user.critical_damage - expectedCriticalDamage) < 0.01;
      
      console.log(`   ${index + 1}. ${user.display_name} (${user.faction})`);
      console.log(`      Ataque: ${user.attack}, Foco: ${user.focus}`);
      console.log(`      Dano Crítico: ${user.critical_damage} (esperado: ${expectedCriticalDamage})`);
      console.log(`      ${isCorrect ? '✅' : '❌'} ${isCorrect ? 'Correto' : 'Incorreto'}`);
    });
    
    console.log('\n🎉 Atualização concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar critical_damage:', error.message);
  } finally {
    await pool.end();
  }
}

updateCriticalDamage();