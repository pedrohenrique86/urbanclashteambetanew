const https = require('https');
const http = require('http');

async function testLogin() {
  try {
    console.log('🔍 Testando login...');
    
    const postData = JSON.stringify({
  email: 'prodrigues42@gmail.com',
  password: 'Pin33564263@'
});
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data });
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', response.data);
    
    if (response.status !== 200) {
      console.log('❌ Erro detectado!');
    } else {
      console.log('✅ Login bem-sucedido!');
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

testLogin();