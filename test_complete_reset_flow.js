const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function testCompleteResetFlow() {
  try {
    console.log('🔄 Testando fluxo completo de reset de senha...');
    
    const email = 'prodrigues42@gmail.com';
    const newPassword = 'NovaSenh@123';
    
    // 1. Solicitar reset de senha
    console.log('\n1️⃣ Solicitando reset de senha...');
    
    const forgotPasswordData = JSON.stringify({ email });
    
    const forgotPasswordOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(forgotPasswordData)
      }
    };
    
    const forgotPasswordResponse = await new Promise((resolve, reject) => {
      const req = http.request(forgotPasswordOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.write(forgotPasswordData);
      req.end();
    });
    
    console.log('📊 Resposta do forgot-password:', forgotPasswordResponse);
    
    // 2. Buscar o token gerado no banco
    console.log('\n2️⃣ Buscando token no banco...');
    
    const tokenResult = await pool.query(
      'SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1',
      [email]
    );
    
    if (tokenResult.rows.length === 0) {
      console.log('❌ Nenhum token encontrado');
      return;
    }
    
    const { password_reset_token: token, password_reset_expires: expires } = tokenResult.rows[0];
    console.log('🔑 Token encontrado:', token);
    console.log('⏰ Expira em:', expires);
    
    // 3. Verificar se o token não expirou
    const isExpired = new Date(expires) < new Date();
    console.log('📅 Token expirado?', isExpired ? '❌ Sim' : '✅ Não');
    
    if (isExpired) {
      console.log('❌ Token expirado, não é possível continuar');
      return;
    }
    
    // 4. Simular URLs
    console.log('\n3️⃣ URLs de reset:');
    console.log('🔗 URL atual (backend):', `http://localhost:3000/reset-password?token=${token}`);
    console.log('🔗 URL hash (alternativa):', `http://localhost:3000/reset-password#type=recovery&token=${token}`);
    
    // 5. Testar reset de senha
    console.log('\n4️⃣ Testando reset de senha...');
    
    const resetPasswordData = JSON.stringify({
      token: token,
      password: newPassword
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
    
    const resetPasswordResponse = await new Promise((resolve, reject) => {
      const req = http.request(resetPasswordOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.write(resetPasswordData);
      req.end();
    });
    
    console.log('📊 Resposta do reset-password:', resetPasswordResponse);
    
    // 6. Verificar se o token foi limpo
    console.log('\n5️⃣ Verificando se token foi limpo...');
    
    const cleanupCheck = await pool.query(
      'SELECT password_reset_token, password_reset_expires FROM users WHERE email = $1',
      [email]
    );
    
    const afterReset = cleanupCheck.rows[0];
    console.log('🧹 Token após reset:', afterReset.password_reset_token || 'NULL (limpo)');
    console.log('🧹 Expires após reset:', afterReset.password_reset_expires || 'NULL (limpo)');
    
    // 7. Testar login com nova senha
    console.log('\n6️⃣ Testando login com nova senha...');
    
    const loginData = JSON.stringify({
      email: email,
      password: newPassword
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });
    
    console.log('📊 Teste de login:', loginResponse.status === 200 ? '✅ Sucesso' : '❌ Falhou');
    if (loginResponse.status !== 200) {
      console.log('❌ Erro no login:', loginResponse.data);
    }
    
    console.log('\n🎉 Teste completo finalizado!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testCompleteResetFlow();