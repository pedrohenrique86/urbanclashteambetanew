const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🔧 Configuração do Ambiente UrbanClash');
  console.log('=====================================\n');

  console.log('Para configurar o envio de emails, você precisa de uma conta SendGrid.');
  console.log('Visite: https://sendgrid.com/ para criar uma conta gratuita.\n');

  // Configurar SendGrid
  const sendgridKey = await question('Digite sua chave API do SendGrid (ou pressione Enter para pular): ');
  const fromEmail = await question('Digite o email remetente (ex: noreply@seudominio.com): ') || 'noreply@urbanclash.com';

  // Configurar JWT Secret
  console.log('\n🔐 Configurando segurança...');
  const jwtSecret = await question('Digite um JWT Secret seguro (ou pressione Enter para gerar automaticamente): ') || generateRandomSecret();

  // Configurar URLs
  console.log('\n🌐 Configurando URLs...');
  const frontendUrl = await question('URL do Frontend (padrão: http://localhost:3000): ') || 'http://localhost:3000';
  const backendUrl = await question('URL do Backend (padrão: http://localhost:3001): ') || 'http://localhost:3001';

  // Criar arquivo .env do backend
  const backendEnvContent = `# Configuração do Banco de Dados
DATABASE_URL=postgresql://urbanclash_user:urbanclash_password@postgres:5432/urbanclash

# JWT Secret
JWT_SECRET=${jwtSecret}

# SendGrid Configuration
SENDGRID_API_KEY=${sendgridKey}
FROM_EMAIL=${fromEmail}

# URLs
FRONTEND_URL=${frontendUrl}
BACKEND_URL=${backendUrl}

# Configuração do Servidor
PORT=3001
NODE_ENV=development
`;

  // Criar arquivo .env.local do frontend
  const frontendEnvContent = `# URL da API local
VITE_API_URL=${backendUrl}/api

# Configurações do frontend
VITE_APP_NAME=UrbanClash
VITE_APP_VERSION=1.0.0
`;

  try {
    // Salvar arquivos
    fs.writeFileSync(path.join(__dirname, 'backend', '.env'), backendEnvContent);
    fs.writeFileSync(path.join(__dirname, '.env.local'), frontendEnvContent);

    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('\n📁 Arquivos criados:');
    console.log('   - backend/.env');
    console.log('   - .env.local');

    if (!sendgridKey) {
      console.log('\n⚠️  ATENÇÃO: SendGrid não foi configurado!');
      console.log('   - Emails de confirmação não funcionarão');
      console.log('   - Configure posteriormente editando backend/.env');
    }

    console.log('\n🚀 Para iniciar o ambiente:');
    console.log('   - Windows: execute start-dev.bat');
    console.log('   - Linux/Mac: execute docker-compose up --build');

    console.log('\n📚 Próximos passos:');
    console.log('   1. Configure o SendGrid se ainda não fez');
    console.log('   2. Execute o ambiente de desenvolvimento');
    console.log('   3. Acesse http://localhost:3000 para o frontend');
    console.log('   4. A API estará em http://localhost:3001');

  } catch (error) {
    console.error('❌ Erro ao criar arquivos de configuração:', error.message);
  }

  rl.close();
}

function generateRandomSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

setupEnvironment().catch(console.error);