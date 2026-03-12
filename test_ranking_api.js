const http = require('http');

const testAPI = () => {
  console.log('🔍 Testando API HTTP em localhost:3001...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/rankings?faction=gangsters',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    console.log('📡 Status:', res.statusCode);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📄 Response:', data);
      
      if (res.statusCode === 200) {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ API funcionando! Dados:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('❌ Resposta não é JSON válido:', e.message);
        }
      } else {
        console.log('❌ Status de erro:', res.statusCode);
      }
      
      process.exit(0);
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Erro na requisição:', error.message);
    process.exit(1);
  });
  
  req.on('timeout', () => {
    console.error('❌ Timeout na requisição');
    req.destroy();
    process.exit(1);
  });
  
  req.end();
};

testAPI();