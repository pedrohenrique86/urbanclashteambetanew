// Usando fetch nativo do Node.js

async function testCurrentToken() {
  try {
    // Primeiro, vamos verificar se o token ainda é válido
    const token = 'test-token-1750646038694-7ldz9a';
    console.log('🔍 Testando token atual:', token);
    
    // Verificar se o usuário ainda existe no banco
    const { Client } = require('pg');
    const client = new Client({
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.osywaarfwrjnctfgxhse',
      password: 'UrbanClash2024!'
    });
    
    await client.connect();
    
    const result = await client.query(
      'SELECT id, email, username, is_email_confirmed, email_confirmation_token FROM users WHERE email_confirmation_token = $1',
      [token]
    );
    
    console.log('📊 Usuário no banco:', result.rows.length > 0 ? result.rows[0] : 'Não encontrado');
    
    if (result.rows.length === 0) {
      console.log('❌ Token não encontrado no banco de dados');
      await client.end();
      return;
    }
    
    const user = result.rows[0];
    if (user.is_email_confirmed) {
      console.log('⚠️ Email já foi confirmado anteriormente');
    }
    
    await client.end();
    
    // Agora testar a API
    console.log('\n🌐 Testando API...');
    const url = `http://localhost:3001/api/auth/confirm-email/${token}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testCurrentToken();