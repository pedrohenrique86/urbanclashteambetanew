const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase local
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClans() {
  try {
    console.log('🔍 Verificando clãs na tabela...');
    
    // Verificar se a tabela existe e contar registros
    const { data, error, count } = await supabase
      .from('clans')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error('❌ Erro ao consultar clãs:', error.message);
      return;
    }
    
    console.log(`✅ Total de clãs encontrados: ${count}`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Lista de clãs:');
      data.forEach((clan, index) => {
        console.log(`${index + 1}. ${clan.name} (${clan.faction})`);
      });
      
      // Contar por facção
      const gangsters = data.filter(c => c.faction === 'gangsters').length;
      const guardas = data.filter(c => c.faction === 'guardas').length;
      
      console.log(`\n📊 Estatísticas:`);
      console.log(`- Gangsters: ${gangsters} clãs`);
      console.log(`- Guardas: ${guardas} clãs`);
    } else {
      console.log('⚠️  Nenhum clã encontrado na tabela!');
    }
    
  } catch (err) {
    console.error('💥 Erro inesperado:', err.message);
  }
}

checkClans();