const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function updateFactionBonuses() {
  try {
    console.log('🔄 Iniciando atualização dos bônus de facção...');
    
    // Buscar todos os usuários
    const usersResult = await pool.query('SELECT * FROM user_profiles');
    const users = usersResult.rows;
    
    console.log(`📊 Encontrados ${users.length} usuários para atualizar`);
    
    for (const user of users) {
      let intimidation = 0;
      let discipline = 0;
      
      if (user.faction === 'gangsters') {
        intimidation = 35.00; // -35% defesa inimiga
        discipline = 0.00;
        console.log(`🔫 Atualizando ${user.faction} (${user.display_name}): Intimidação = 35%`);
      } else if (user.faction === 'guardas') {
        intimidation = 0.00;
        discipline = 40.00; // -40% dano recebido
        console.log(`🛡️ Atualizando ${user.faction} (${user.display_name}): Disciplina = 40%`);
      }
      
      // Atualizar o usuário
      await pool.query(
        'UPDATE user_profiles SET intimidation = $1, discipline = $2 WHERE id = $3',
        [intimidation, discipline, user.id]
      );
    }
    
    console.log('✅ Atualização dos bônus de facção concluída!');
    
    // Verificação final
    console.log('\n🔍 Verificação final:');
    const verificationResult = await pool.query(
      'SELECT faction, display_name, intimidation, discipline FROM user_profiles ORDER BY faction, display_name'
    );
    
    verificationResult.rows.forEach(user => {
      console.log(`${user.faction} (${user.display_name}): Intimidação = ${user.intimidation}%, Disciplina = ${user.discipline}%`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar bônus de facção:', error.message);
  } finally {
    await pool.end();
  }
}

updateFactionBonuses();