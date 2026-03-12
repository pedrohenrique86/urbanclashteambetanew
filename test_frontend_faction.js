// Teste para verificar qual valor de facção está sendo enviado pelo frontend

const testFactions = ['gangster', 'gangsters', 'guardas', 'guarda'];

for (const faction of testFactions) {
  console.log(`\n🔍 Testando facção: ${faction}`);
  
  fetch(`http://localhost:3001/api/clans/by-faction/${faction}`)
    .then(response => {
      console.log(`Status: ${response.status}`);
      return response.text();
    })
    .then(text => {
      console.log(`Resposta: ${text}`);
    })
    .catch(error => {
      console.error(`Erro: ${error.message}`);
    });
}

// Aguardar um pouco antes de sair
setTimeout(() => {
  console.log('\n✅ Teste concluído');
  process.exit(0);
}, 2000);