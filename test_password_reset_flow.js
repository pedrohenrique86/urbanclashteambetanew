const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testPasswordResetFlow() {
  try {
    console.log('🔍 Testando fluxo de recuperação de senha...');
    
    const email = 'prodrigues42@gmail.com';
    
    // 1. Verificar se o usuário existe
    console.log('\n1️⃣ Verificando usuário...');
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:', user);
    
    // 2. Gerar token de reset
    console.log('\n2️⃣ Gerando token de reset...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    
    console.log('🔑 Token gerado:', resetToken);
    console.log('⏰ Expira em:', resetExpires);
    
    // 3. Salvar token no banco
    console.log('\n3️⃣ Salvando token no banco...');
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );
    
    // 4. Verificar se foi salvo
    const tokenCheck = await pool.query(
      'SELECT password_reset_token, password_reset_expires FROM users WHERE id = $1',
      [user.id]
    );
    
    console.log('✅ Token salvo no banco:', tokenCheck.rows[0]);
    
    // 5. Simular URLs que seriam geradas
    console.log('\n4️⃣ URLs geradas:');
    console.log('🔗 URL atual (backend):', `http://localhost:3000/reset-password?token=${resetToken}`);
    console.log('🔗 URL esperada (frontend):', `http://localhost:3000/reset-password#type=recovery&token=${resetToken}`);
    
    // 6. Testar validação do token
    console.log('\n5️⃣ Testando validação do token...');
    const validationResult = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [resetToken]
    );
    
    if (validationResult.rows.length > 0) {
      console.log('✅ Token válido e não expirado');
    } else {
      console.log('❌ Token inválido ou expirado');
    }
    
    // 7. Verificar tokens existentes
    console.log('\n6️⃣ Verificando todos os tokens de reset...');
    const allTokens = await pool.query(
      'SELECT id, email, password_reset_token, password_reset_expires FROM users WHERE password_reset_token IS NOT NULL'
    );
    
    console.log('📋 Tokens ativos:');
    allTokens.rows.forEach((row, index) => {
      const isExpired = new Date(row.password_reset_expires) < new Date();
      console.log(`${index + 1}. Email: ${row.email}`);
      console.log(`   Token: ${row.password_reset_token}`);
      console.log(`   Expira: ${row.password_reset_expires}`);
      console.log(`   Status: ${isExpired ? '❌ Expirado' : '✅ Válido'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

testPasswordResetFlow();