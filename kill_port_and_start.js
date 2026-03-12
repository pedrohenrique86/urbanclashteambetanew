const { exec, spawn } = require('child_process');
const path = require('path');

const PORT = 3001;
const serverPath = path.join(__dirname, 'backend', 'server.js');

console.log(`🔍 Verificando processos na porta ${PORT}...`);

// Função para encontrar e matar processos usando a porta
function findAndKillProcess() {
  return new Promise((resolve, reject) => {
    // Comando para encontrar o PID do processo usando a porta (Windows)
    exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
      if (error && !stdout) {
        console.log(`✅ Nenhum processo encontrado na porta ${PORT}`);
        return resolve(false);
      }

      // Extrair PIDs das linhas de saída
      const lines = stdout.split('\n').filter(line => line.includes(`LISTENING`));
      
      if (lines.length === 0) {
        console.log(`✅ Nenhum processo em estado LISTENING na porta ${PORT}`);
        return resolve(false);
      }

      // Extrair PIDs
      const pids = [];
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid))) {
          pids.push(pid);
        }
      });

      if (pids.length === 0) {
        console.log(`⚠️ Não foi possível extrair PIDs dos processos`);
        return resolve(false);
      }

      // Remover duplicatas
      const uniquePids = [...new Set(pids)];
      console.log(`🔍 Processos encontrados na porta ${PORT}: ${uniquePids.join(', ')}`);

      // Matar cada processo
      let killedCount = 0;
      uniquePids.forEach(pid => {
        exec(`taskkill /F /PID ${pid}`, (killError, killStdout, killStderr) => {
          if (killError) {
            console.error(`❌ Erro ao matar processo ${pid}: ${killError.message}`);
          } else {
            console.log(`✅ Processo ${pid} encerrado com sucesso`);
            killedCount++;
          }

          if (killedCount === uniquePids.length) {
            console.log(`✅ Todos os processos na porta ${PORT} foram encerrados`);
            resolve(true);
          }
        });
      });
    });
  });
}

// Função para iniciar o servidor
function startServer() {
  console.log('🚀 Iniciando servidor...');
  console.log(`📂 Caminho do servidor: ${serverPath}`);

  // Configurar variáveis de ambiente
  const env = {
    ...process.env,
    NODE_ENV: 'development',
  };

  // Iniciar o servidor com Node
  const server = spawn('node', [serverPath], {
    env,
    stdio: 'inherit', // Mostrar saída no console atual
    cwd: path.join(__dirname, 'backend')
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
}

// Executar a sequência
async function main() {
  try {
    // Primeiro, tentar matar processos existentes
    await findAndKillProcess();
    
    // Esperar um pouco para garantir que a porta seja liberada
    console.log('⏳ Aguardando liberação da porta...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Iniciar o servidor
    startServer();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();