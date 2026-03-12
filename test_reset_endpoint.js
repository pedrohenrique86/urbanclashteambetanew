const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testResetEndpoint() {
  try {
    console.log('🔄 Testando endpoint de reset de senha...');
    
    const email = 'prodrigues42@gmail.com';
    
    // 1. Primeiro, gerar um token válido
    console.log('\n1️⃣ Gerando token válido...');
    
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [token, resetExpires, email]
    );
    
    console.log('🔑 Token gerado:', token);
    console.log('⏰ Expira em:', resetExpires);
    
    // 2. Testar diferentes senhas
    const testPasswords = [
      'NovaSenh@123',  // Válida
      'senha123',      // Sem maiúscula e símbolo
      'SENHA123!',     // Sem minúscula
      'SenhaForte!',   // Sem número
      'SenhaForte123', // Sem símbolo
      'Senh@1'         // Muito curta
    ];
    
    for (const password of testPasswords) {
      console.log(`\n🔐 Testando senha: "${password}"`);
      
      const resetPasswordData = JSON.stringify({
        token: token,
        password: password
      });
      
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
                data: JSON.parse(data)
              });
            } catch (e) {
              resolve({
                status: res.statusCode,
                data: data,
                parseError: e.message
              });
            }
          });
        });
        
        req.on('error', reject);
        req.write(resetPasswordData);
        req.end();
      });
      
      console.log('📊 Status:', response.status);
      console.log('📊 Resposta:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('✅ Senha aceita!');
        break; // Parar no primeiro sucesso
      } else {
        console.log('❌ Senha rejeitada');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testResetEndpoint();