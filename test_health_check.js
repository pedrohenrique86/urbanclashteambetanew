const http = require('http');

// Função para fazer requisição HTTP
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testHealthCheck() {
  console.log('🔍 Testando health check...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  try {
    console.log('📡 Fazendo requisição para:', `http://${options.hostname}:${options.port}${options.path}`);
    
    const response = await makeRequest(options);
    
    console.log('📊 Status:', response.statusCode);
    console.log('📄 Body:', response.body);
    
    if (response.statusCode === 200) {
      console.log('✅ Health check OK!');
    } else {
      console.log('❌ Health check falhou:', response.statusCode);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testHealthCheck();