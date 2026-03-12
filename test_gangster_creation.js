const { Pool } = require('pg');
const axios = require('axios');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

const API_BASE_URL = 'http://localhost:3002/api';

async function testGangsterCreation() {
  try {
    console.log('🧪 Testando criação de usuário Gangster...');
    
    // Primeiro, vamos verificar se a função getFactionStats está retornando os valores corretos
    console.log('\n📊 Verificando função getFactionStats para gangsters:');
    
    // Simular a função getFactionStats
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
      }
      return baseStats;
    }
    
    const gangstersStats = getFactionStats('gangsters');
    console.log(`   Ataque: ${gangstersStats.attack} (esperado: 8)`);
    console.log(`   Defesa: ${gangstersStats.defense} (esperado: 3)`);
    console.log(`   Foco: ${gangstersStats.focus} (esperado: 5)`);
    
    // Verificar se há algum usuário gangster no banco
    const existingGangsters = await pool.query(`
      SELECT 
        display_name,
        attack,
        defense,
        focus
      FROM user_profiles 
      WHERE faction = 'gangsters'
      ORDER BY created_at DESC
    `);
    
    if (existingGangsters.rows.length > 0) {
      console.log('\n📊 Usuários Gangsters existentes no banco:');
      existingGangsters.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.display_name}`);
        console.log(`      Ataque: ${user.attack}, Defesa: ${user.defense}, Foco: ${user.focus}`);
        
        if (user.attack === 8 && user.defense === 3 && user.focus === 5) {
          console.log(`      ✅ Valores corretos!`);
        } else {
          console.log(`      ❌ Valores incorretos! Esperado: 8,3,5`);
        }
      });
    } else {
      console.log('\n📊 Nenhum usuário Gangster encontrado no banco.');
    }
    
    // Testar endpoint do backend diretamente
    console.log('\n🔧 Testando endpoint do backend...');
    try {
      const response = await axios.get(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      console.log('✅ Backend respondeu:', response.status);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️  Backend respondeu com erro ${error.response.status}: ${error.response.data?.error || 'Erro desconhecido'}`);
      } else {
        console.log(`❌ Erro ao conectar com backend: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testGangsterCreation();