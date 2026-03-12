const { Pool } = require('pg');
require('dotenv').config();

// Teste 1: URL do .env
console.log('🔍 Testando URL do .env:', process.env.DATABASE_URL);

// Teste 2: URL com escape
const urlEscaped = 'postgresql://postgres:W0rdPr355%40%40@localhost:5432/urbanclash';
console.log('🔍 Testando URL com escape:', urlEscaped);

// Teste 3: Configuração por partes
const configParts = {
  user: 'postgres',
  password: 'W0rdPr355@@',
  host: 'localhost',
  port: 5432,
  database: 'urbanclash'
};
console.log('🔍 Testando configuração por partes:', configParts);

async function testConnection(config, name) {
  try {
    const pool = new Pool(config);
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ ${name} - Conexão OK:`, result.rows[0].now);
    await pool.end();
    return true;
  } catch (error) {
    console.error(`❌ ${name} - Erro:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Iniciando testes de conexão...\n');
  
  await testConnection({ connectionString: process.env.DATABASE_URL }, 'URL do .env');
  await testConnection({ connectionString: urlEscaped }, 'URL com escape');
  await testConnection(configParts, 'Configuração por partes');
  
  console.log('\n🏁 Testes concluídos.');
  process.exit(0);
}

runTests().catch(console.error);