const { query } = require('./backend/config/database');

async function checkTokens() {
  try {
    console.log('🔍 Verificando tokens na base de dados...');
    
    const result = await query(
      'SELECT id, email, email_confirmation_token, is_email_confirmed FROM users WHERE email_confirmation_token IS NOT NULL ORDER BY id DESC LIMIT 5'
    );
    
    console.log('📊 Tokens encontrados:', result.rows.length);
    
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Email: ${row.email}, Token: ${row.email_confirmation_token}, Confirmado: ${row.is_email_confirmed}`);
    });
    
    // Verificar especificamente o token que estamos testando
    const specificToken = 'test-token-1750647259803-r8yqi4';
    const specificResult = await query(
      'SELECT id, email, email_confirmation_token, is_email_confirmed FROM users WHERE email_confirmation_token = $1',
      [specificToken]
    );
    
    console.log('\n🎯 Verificação do token específico:', specificToken);
    if (specificResult.rows.length > 0) {
      const user = specificResult.rows[0];
      console.log(`✅ Token encontrado! ID: ${user.id}, Email: ${user.email}, Confirmado: ${user.is_email_confirmed}`);
    } else {
      console.log('❌ Token específico não encontrado na base de dados');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkTokens();