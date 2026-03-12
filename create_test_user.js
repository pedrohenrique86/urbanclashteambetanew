const { query } = require('./backend/config/database.js');

async function createTestUser() {
  try {
    const email = 'teste' + Date.now() + '@example.com';
    const username = 'testusuario' + Date.now();
    const testToken = 'test_token_' + Date.now() + '_abcdef123456';
    
    console.log('🔧 Criando usuário de teste...');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Token:', testToken);
    
    // Inserir usuário diretamente com senha hash simples
    const userResult = await query(
      `INSERT INTO users (email, username, password_hash, email_confirmation_token, is_email_confirmed) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username`,
      [email, username, 'simple_hash_for_test', testToken, false]
    );
    
    const user = userResult.rows[0];
    console.log('✅ Usuário criado:', user);
    
    // Criar perfil padrão
    await query(
      `INSERT INTO user_profiles (user_id, display_name) 
       VALUES ($1, $2)`,
      [user.id, username]
    );
    
    console.log('✅ Perfil criado');
    console.log('🔗 URL de confirmação: http://localhost:3000/confirm-email?token=' + testToken);
    console.log('🧪 Para testar API: http://localhost:3000/api/auth/confirm-email/' + testToken);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

createTestUser();