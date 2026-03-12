// Teste direto da funcionalidade de seleção de clãs
const fetch = require('node-fetch');

async function testClanSelection() {
  try {
    console.log('🔍 Testando seleção de clãs...');
    
    // Testar facção gangsters
    console.log('\n📊 Testando facção: gangsters');
    const response = await fetch('http://localhost:3001/api/clans/by-faction/gangsters');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Resposta recebida:');
    console.log(`- Status: ${response.status}`);
    console.log(`- Número de clãs: ${data.clans ? data.clans.length : 0}`);
    
    if (data.clans && data.clans.length > 0) {
      console.log('- Primeiro clã:', data.clans[0].name);
      console.log('- Facção do primeiro clã:', data.clans[0].faction);
    } else {
      console.log('❌ Nenhum clã encontrado!');
    }
    
    // Testar facção guardas
    console.log('\n📊 Testando facção: guardas');
    const response2 = await fetch('http://localhost:3001/api/clans/by-faction/guardas');
    
    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}: ${response2.statusText}`);
    }
    
    const data2 = await response2.json();
    console.log('✅ Resposta recebida:');
    console.log(`- Status: ${response2.status}`);
    console.log(`- Número de clãs: ${data2.clans ? data2.clans.length : 0}`);
    
    if (data2.clans && data2.clans.length > 0) {
      console.log('- Primeiro clã:', data2.clans[0].name);
      console.log('- Facção do primeiro clã:', data2.clans[0].faction);
    } else {
      console.log('❌ Nenhum clã encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testClanSelection();