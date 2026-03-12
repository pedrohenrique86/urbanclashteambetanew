const { query } = require('./backend/config/database');

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco...');
    
    const result = await query('SELECT id, email, username, is_email_confirmed FROM users LIMIT 5');
    
    console.log('👥 Usuários encontrados:', result.rows.length);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Confirmado: ${user.is_email_confirmed}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

checkUsers();