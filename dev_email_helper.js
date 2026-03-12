#!/usr/bin/env node

/**
 * Helper para desenvolvimento - Geração automática de tokens de confirmação
 * Resolve o problema de tokens de uso único durante desenvolvimento
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Configuração do banco
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const query = (text, params) => pool.query(text, params);

class DevEmailHelper {
  constructor() {
    this.baseEmail = 'dev-test';
    this.domain = '@example.com';
  }

  generateToken() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(3).toString('hex');
    return `dev-token-${timestamp}-${random}`;
  }

  generateEmail() {
    const timestamp = Date.now();
    return `${this.baseEmail}-${timestamp}${this.domain}`;
  }

  async createFreshToken() {
    try {
      console.log('🔄 Criando novo token de desenvolvimento...');
      
      const email = this.generateEmail();
      const username = `devuser${Date.now()}`;
      const token = this.generateToken();
      const hashedPassword = '$2a$10$dummy.hash.for.dev.testing.only';

      // Inserir usuário com token
      const result = await query(
        `INSERT INTO users (id, email, username, password_hash, email_confirmation_token, is_email_confirmed, created_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW()) 
         RETURNING id, email, username`,
        [email, username, hashedPassword, token]
      );

      const user = result.rows[0];
      
      console.log('✅ Token criado com sucesso!');
      console.log('📧 Email:', user.email);
      console.log('👤 Username:', user.username);
      console.log('🎫 Token:', token);
      console.log('🔗 Link de teste:');
      console.log(`   http://localhost:3000/email-confirmation?token=${token}`);
      console.log('');
      
      return {
        user,
        token,
        testLink: `http://localhost:3000/email-confirmation?token=${token}`
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar token:', error.message);
      throw error;
    }
  }

  async cleanupOldTokens() {
    try {
      console.log('🧹 Limpando tokens antigos de desenvolvimento...');
      
      const result = await query(
        `DELETE FROM users 
         WHERE email LIKE $1 
         AND created_at < NOW() - INTERVAL '1 hour'`,
        [`${this.baseEmail}%${this.domain}`]
      );
      
      console.log(`🗑️ ${result.rowCount} tokens antigos removidos.`);
      
    } catch (error) {
      console.error('❌ Erro na limpeza:', error.message);
    }
  }

  async getActiveTokens() {
    try {
      const result = await query(
        `SELECT email, email_confirmation_token, created_at 
         FROM users 
         WHERE email LIKE $1 
         AND email_confirmation_token IS NOT NULL 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [`${this.baseEmail}%${this.domain}`]
      );
      
      console.log('📋 Tokens ativos de desenvolvimento:');
      if (result.rows.length === 0) {
        console.log('   Nenhum token ativo encontrado.');
      } else {
        result.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.email}`);
          console.log(`      Token: ${row.email_confirmation_token}`);
          console.log(`      Criado: ${row.created_at}`);
          console.log(`      Link: http://localhost:3000/email-confirmation?token=${row.email_confirmation_token}`);
          console.log('');
        });
      }
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Erro ao buscar tokens:', error.message);
      throw error;
    }
  }

  async quickTest() {
    try {
      console.log('🚀 Teste rápido - Criando token e testando API...');
      
      const { token } = await this.createFreshToken();
      
      // Testar API
      const response = await fetch(`http://localhost:3001/api/auth/confirm-email/${token}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ API funcionando! Resposta:', data.message);
      } else {
        console.log('❌ Erro na API:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const helper = new DevEmailHelper();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'new':
      case 'create':
        await helper.createFreshToken();
        break;
        
      case 'list':
      case 'show':
        await helper.getActiveTokens();
        break;
        
      case 'clean':
      case 'cleanup':
        await helper.cleanupOldTokens();
        break;
        
      case 'test':
        await helper.quickTest();
        break;
        
      default:
        console.log('🛠️  Helper de Desenvolvimento - Tokens de Email');
        console.log('');
        console.log('Comandos disponíveis:');
        console.log('  node dev_email_helper.js new     - Criar novo token');
        console.log('  node dev_email_helper.js list    - Listar tokens ativos');
        console.log('  node dev_email_helper.js clean   - Limpar tokens antigos');
        console.log('  node dev_email_helper.js test    - Teste rápido completo');
        console.log('');
        console.log('Exemplos:');
        console.log('  npm run dev:token        # Criar novo token');
        console.log('  npm run dev:token-list   # Ver tokens disponíveis');
        break;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = DevEmailHelper;