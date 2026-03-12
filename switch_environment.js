const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurações
const envPath = path.join(__dirname, '.env');

// Configurações do Supabase local
const localConfig = {
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.OXBO4nlx6T3RAvb8Dzw8OmNYPxlhCFWjrm4zzRrC2Xs',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
};

// Interface para leitura de entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para ler o arquivo .env atual
function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    // Ignorar linhas de comentário ou vazias
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Reconectar valores que possam conter '='
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

// Função para salvar configurações no arquivo .env
function saveEnvFile(config) {
  let envContent = '# Supabase Configuration\n';
  
  for (const [key, value] of Object.entries(config)) {
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
      envContent += '# Chave de serviço (não expor no frontend)\n';
    }
    envContent += `${key}=${value}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Arquivo .env atualizado com sucesso!`);
}

// Função para detectar o ambiente atual
function detectCurrentEnvironment(currentConfig) {
  if (!currentConfig.VITE_SUPABASE_URL) {
    return 'nenhum';
  }
  
  if (currentConfig.VITE_SUPABASE_URL === localConfig.VITE_SUPABASE_URL) {
    return 'local';
  }
  
  return 'remoto';
}

// Função principal
async function switchEnvironment() {
  console.log('🔄 Utilitário para alternar entre ambientes Supabase\n');
  
  // Ler configuração atual
  const currentConfig = readEnvFile();
  const currentEnv = detectCurrentEnvironment(currentConfig);
  
  console.log(`Ambiente atual: ${currentEnv === 'local' ? 'LOCAL' : currentEnv === 'remoto' ? 'REMOTO' : 'NÃO CONFIGURADO'}\n`);
  
  // Perguntar qual ambiente o usuário deseja usar
  rl.question('Qual ambiente você deseja usar? (1 = Local, 2 = Remoto): ', (answer) => {
    if (answer === '1') {
      // Mudar para ambiente local
      console.log('\n🔄 Mudando para ambiente LOCAL...');
      saveEnvFile(localConfig);
      console.log('\n✅ Configuração atualizada para ambiente LOCAL!');
      console.log('\n⚠️  Lembre-se de iniciar o Supabase local com o comando:');
      console.log('supabase start');
    } else if (answer === '2') {
      if (currentEnv === 'remoto') {
        console.log('\n✅ Você já está usando o ambiente REMOTO!');
        rl.close();
        return;
      }
      
      // Solicitar informações do ambiente remoto
      rl.question('\nURL do Supabase remoto: ', (url) => {
        rl.question('Chave anônima do Supabase remoto: ', (anonKey) => {
          rl.question('Chave de serviço do Supabase remoto: ', (serviceKey) => {
            // Mudar para ambiente remoto
            console.log('\n🔄 Mudando para ambiente REMOTO...');
            
            const remoteConfig = {
              VITE_SUPABASE_URL: url,
              VITE_SUPABASE_ANON_KEY: anonKey,
              SUPABASE_SERVICE_ROLE_KEY: serviceKey
            };
            
            saveEnvFile(remoteConfig);
            console.log('\n✅ Configuração atualizada para ambiente REMOTO!');
            rl.close();
          });
        });
      });
      return;
    } else {
      console.log('\n❌ Opção inválida! Por favor, execute novamente e escolha 1 ou 2.');
      rl.close();
    }
    
    rl.close();
  });
}

switchEnvironment();