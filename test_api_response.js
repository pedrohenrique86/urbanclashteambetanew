const http = require('http');

function testApiResponse() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/users/rankings?faction=gangsters',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\nResposta completa:');
      console.log(data);
      
      try {
        const parsed = JSON.parse(data);
        console.log('\nDados parseados:');
        console.log(JSON.stringify(parsed, null, 2));
        
        if (parsed.leaderboard && parsed.leaderboard.length > 0) {
          console.log('\nPrimeiro jogador:');
          console.log(JSON.stringify(parsed.leaderboard[0], null, 2));
          
          console.log('\nCampo country presente?', 'country' in parsed.leaderboard[0]);
          console.log('Valor do country:', parsed.leaderboard[0].country);
        }
      } catch (error) {
        console.error('Erro ao parsear JSON:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Erro na requisição:', error);
  });

  req.end();
}

testApiResponse();