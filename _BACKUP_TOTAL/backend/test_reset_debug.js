const http = require('http');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testResetWithDebug() {
  try {
    console.log('🔄 Testando reset com debug detalhado...');
    
    const email = 'prodrigues42@gmail.com';
    const password = 'NovaSenh@123';
    
    // 1. Gerar token válido
    const token = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    
    console.log('🔑 Token gerado:', token);
    console.log('⏰ Expira em:', resetExpires);
    
    // 2. Inserir token no banco
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [token, resetExpires, email]
    );
    
    console.log('✅ Token inserido no banco');
    
    // 3. Verificar se o usuário existe e tem o token
    const userCheck = await pool.query(
      'SELECT id, email, password_reset_token, password_reset_expires FROM users WHERE email = $1',
      [email]
    );
    
    console.log('👤 Dados do usuário:', userCheck.rows[0]);
    
    // 4. Testar o endpoint
    console.log('\n🔄 Fazendo requisição para reset-password...');
    
    const resetPasswordData = JSON.stringify({
      token: token,
      password: password
    });
    
    console.log('📤 Dados enviados:', { token, password });
    
    const resetPasswordOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/reset-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(resetPasswordData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(resetPasswordOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data,
              parseError: e.message
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Erro na requisição:', error);
        reject(error);
      });
      
      req.write(resetPasswordData);
      req.end();
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', response.headers);
    console.log('📊 Dados da resposta:', response.data);
    
    // 5. Verificar estado do usuário após tentativa
    const userAfter = await pool.query(
      'SELECT id, email, password_reset_token, password_reset_expires FROM users WHERE email = $1',
      [email]
    );
    
    console.log('\n👤 Dados do usuário após tentativa:', userAfter.rows[0]);
    
    // 6. Verificar se há sessões ativas
    const sessions = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1',
      [userAfter.rows[0].id]
    );
    
    console.log('🔐 Sessões ativas:', sessions.rows.length);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testResetWithDebug();