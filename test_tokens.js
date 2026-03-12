const { query } = require('./backend/config/database.js');

async function testTokens() {
  try {
    console.log('🔍 Verificando tokens de confirmação na base de dados...');
    const result = await query('SELECT email, email_confirmation_token, is_email_confirmed FROM users LIMIT 5');
    console.log('📊 Resultados encontrados:', result.rows.length);
    
    result.rows.forEach((user, index) => {
      console.log(`👤 Usuário ${index + 1}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Token: ${user.email_confirmation_token ? user.email_confirmation_token.substring(0, 10) + '...' : 'NULL'}`);
      console.log(`   Confirmado: ${user.is_email_confirmed}`);
      console.log('');
    });
    
    // Testar com um token específico se existir
    if (result.rows.length > 0 && result.rows[0].email_confirmation_token) {
      const testToken = result.rows[0].email_confirmation_token;
      console.log('🧪 Testando confirmação com token:', testToken.substring(0, 10) + '...');
      
      const tokenTest = await query(
        'SELECT id, email, username, is_email_confirmed FROM users WHERE email_confirmation_token = $1',
        [testToken]
      );
      
      console.log('✅ Token encontrado:', tokenTest.rows.length > 0);
      if (tokenTest.rows.length > 0) {
        console.log('📋 Dados do usuário:', tokenTest.rows[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

testTokens();