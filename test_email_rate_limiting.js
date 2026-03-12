const { Pool } = require('pg');
const http = require('http');
const https = require('https');

// Função helper para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusCode: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432
});

const API_BASE_URL = 'http://localhost:3001/api';

async function testEmailRateLimiting() {
  try {
    console.log('🧪 Testando rate limiting de reenvio de email...');
    
    // Criar um usuário de teste não confirmado
    const testEmail = 'test_rate_limiting@example.com';
    const testUsername = 'test_rate_user';
    const testPassword = 'TestPassword123!';
    
    // Limpar usuário de teste se existir
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    
    // Registrar usuário de teste
    console.log('📝 Registrando usuário de teste...');
    const registerResponse = await makeRequest(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: testPassword
      })
    });
    
    if (!registerResponse.ok) {
      const error = await registerResponse.text();
      console.error('❌ Erro no registro:', error);
      return;
    }
    
    console.log('✅ Usuário registrado com sucesso');
    
    // Teste 1: Primeiro reenvio (deve funcionar)
    console.log('\n🔄 Teste 1: Primeiro reenvio...');
    const firstResend = await makeRequest(`${API_BASE_URL}/auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    if (firstResend.ok) {
      console.log('✅ Primeiro reenvio bem-sucedido');
    } else {
      const error = await firstResend.text();
      console.error('❌ Erro no primeiro reenvio:', error);
    }
    
    // Teste 2: Segundo reenvio imediato (deve ser bloqueado)
    console.log('\n🚫 Teste 2: Segundo reenvio imediato (deve ser bloqueado)...');
    const secondResend = await makeRequest(`${API_BASE_URL}/auth/resend-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    if (secondResend.status === 429) {
      const errorData = await secondResend.json();
      console.log('✅ Rate limiting funcionando:', errorData.error);
    } else {
      console.error('❌ Rate limiting não está funcionando - status:', secondResend.status);
    }
    
    // Teste 3: Verificar timestamp no banco
    console.log('\n📊 Verificando timestamp no banco...');
    const userCheck = await pool.query(
      'SELECT last_confirmation_email_sent FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].last_confirmation_email_sent) {
      console.log('✅ Timestamp salvo no banco:', userCheck.rows[0].last_confirmation_email_sent);
    } else {
      console.error('❌ Timestamp não foi salvo no banco');
    }
    
    // Limpar usuário de teste
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    console.log('\n🧹 Usuário de teste removido');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testEmailRateLimiting();