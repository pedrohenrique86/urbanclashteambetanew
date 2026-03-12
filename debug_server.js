const { spawn } = require('child_process');
const path = require('path');

// Caminho para o arquivo server.js
const serverPath = path.join(__dirname, 'backend', 'server.js');

console.log('🔍 Iniciando servidor em modo debug...');
console.log(`📂 Caminho do servidor: ${serverPath}`);

// Configurar variáveis de ambiente para mostrar mais detalhes de erro
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DEBUG: '*',
};

// Iniciar o servidor com Node diretamente (sem nodemon)
const server = spawn('node', [serverPath], {
  env,
  stdio: 'inherit', // Mostrar saída no console atual
});

server.on('error', (error) => {
  console.error('❌ Erro ao iniciar o servidor:', error.message);
});

server.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Servidor encerrado com código de erro: ${code}`);
    if (signal) {
      console.error(`Sinal recebido: ${signal}`);
    }
  } else {
    console.log('✅ Servidor encerrado normalmente');
  }
});

// Capturar CTRL+C para encerrar o processo corretamente
process.on('SIGINT', () => {
  console.log('🛑 Encerrando servidor...');
  server.kill('SIGINT');
  process.exit(0);
});