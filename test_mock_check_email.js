// Script para simular a resposta da função serverless check-email.js
const http = require('http');

// Criar um servidor HTTP simples que simula a função serverless
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email } = JSON.parse(body);
        console.log(`Recebida requisição para verificar email: ${email}`);
        
        // Simular diferentes respostas com base no email
        let response = { exists: false, confirmed: false };
        
        if (email.includes('confirmado')) {
          response = { exists: true, confirmed: true };
          console.log('Simulando email existente e confirmado');
        } else if (email.includes('naoconfirmado')) {
          response = { exists: true, confirmed: false };
          console.log('Simulando email existente mas não confirmado');
        } else {
          console.log('Simulando email não existente');
        }
        
        // Enviar resposta
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Requisição inválida' }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Método não permitido' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Servidor mock rodando em http://localhost:${PORT}`);
  console.log('Para testar, use os seguintes emails:');
  console.log('- email.confirmado@exemplo.com -> Simula email existente e confirmado');
  console.log('- email.naoconfirmado@exemplo.com -> Simula email existente mas não confirmado');
  console.log('- qualquer.outro@exemplo.com -> Simula email não existente');
  console.log('\nPressione Ctrl+C para encerrar o servidor');
});