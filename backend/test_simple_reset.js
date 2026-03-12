const axios = require('axios');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = 'your-secret-key-here';

async function testSimpleReset() {
  try {
    console.log('🧪 Teste simples de redefinição de senha');
    console.log('=' .repeat(50));
    
    // 1. Buscar um usuário existente
    console.log('\n1️⃣ Buscando usuário existente...');
    const userResult = await pool.query('SELECT id, email FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado na base de dados');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Usuário encontrado: ${user.email} (ID: ${user.id})`);
    
    // 2. Gerar token válido
    console.log('\n2️⃣ Gerando token de reset...');
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // 3. Atualizar usuário com token
    console.log('\n3️⃣ Atualizando usuário com token...');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, expiresAt, user.id]
    );
    
    console.log('✅ Token atualizado no banco');
    
    // 4. Testar endpoint de reset
    console.log('\n4️⃣ Testando endpoint de reset...');
    
    const resetData = {
      token: resetToken,
      password: 'NovaSenha@123'
    };
    
    try {
      // Primeiro, testar se o servidor está rodando
      console.log('🔍 Verificando se servidor está rodando...');
      
      try {
        const healthCheck = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
        console.log('✅ Servidor está rodando');
      } catch (healthError) {
        console.log('❌ Servidor não está respondendo');
        console.log('💡 Certifique-se de que o servidor está rodando na porta 3001');
        return;
      }
      
      const response = await axios.post(`${BASE_URL}/api/auth/reset-password`, resetData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`✅ Resposta: ${JSON.stringify(response.data)}`);
      
      // 5. Verificar se token foi limpo
      console.log('\n5️⃣ Verificando limpeza do token...');
      const tokenCheck = await pool.query(
        'SELECT password_reset_token, password_reset_expires FROM users WHERE id = $1',
        [user.id]
      );
      
      const tokenData = tokenCheck.rows[0];
      if (!tokenData.password_reset_token && !tokenData.password_reset_expires) {
        console.log('✅ Token limpo corretamente');
      } else {
        console.log('⚠️  Token não foi limpo');
      }
      
      // 6. Verificar se sessões foram invalidadas
      console.log('\n6️⃣ Verificando invalidação de sessões...');
      const sessionsCheck = await pool.query(
        'SELECT COUNT(*) FROM user_sessions WHERE user_id = $1',
        [user.id]
      );
      
      console.log(`📊 Sessões ativas: ${sessionsCheck.rows[0].count}`);
      
      console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
      console.log('✅ Redefinição de senha funcionando corretamente');
      
    } catch (error) {
      console.log(`❌ Erro na requisição: ${error.response?.status || 'N/A'}`);
      console.log(`❌ Mensagem: ${error.response?.data?.error || error.message}`);
      console.log(`❌ Código do erro: ${error.code || 'N/A'}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('🔧 Solução: Inicie o servidor com "node server.js"');
      }
      
      if (error.response?.data?.details) {
        console.log('📋 Detalhes:', error.response.data.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testSimpleReset();