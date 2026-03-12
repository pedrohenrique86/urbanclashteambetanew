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

async function testRankingAPI() {
  console.log('🔍 Testando API de ranking com logs detalhados...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/rankings?faction=gangsters&limit=10',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  try {
    console.log('📡 Fazendo requisição para:', `http://${options.hostname}:${options.port}${options.path}`);
    
    const response = await makeRequest(options);
    
    console.log('📊 Status:', response.statusCode);
    console.log('📋 Headers:', response.headers);
    console.log('📄 Body:', response.body);
    
    if (response.statusCode === 200) {
      try {
        const jsonData = JSON.parse(response.body);
        console.log('✅ JSON válido recebido:');
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse do JSON:', parseError.message);
      }
    } else {
      console.log('❌ Status de erro:', response.statusCode);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testRankingAPI();