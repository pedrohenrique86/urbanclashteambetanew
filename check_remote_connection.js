const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase remoto (usando variáveis de ambiente)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ As variáveis de ambiente do Supabase remoto não estão configuradas.');
  console.error('Por favor, crie um arquivo .env com as seguintes variáveis:');
  console.error('VITE_SUPABASE_URL=seu_url_supabase_remoto');
  console.error('SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_supabase_remoto');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  try {
    console.log('🔍 Verificando conexão com o Supabase remoto...');
    console.log(`URL: ${supabaseUrl}`);
    
    // Tentar fazer uma consulta simples para verificar a conexão
    const { data, error } = await supabase.from('clans').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro ao conectar com o Supabase remoto:', error.message);
      console.error('Detalhes:', error);
      return;
    }
    
    console.log('✅ Conexão com o Supabase remoto estabelecida com sucesso!');
    
    // Verificar tabelas existentes
    console.log('\n🔍 Verificando tabelas existentes...');
    
    const tables = ['clans', 'user_profiles'];
    
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ Erro ao verificar tabela ${table}:`, error.message);
      } else {
        console.log(`✅ Tabela ${table} encontrada.`);
      }
    }
    
    console.log('\n✨ Verificação concluída!');
    
  } catch (err) {
    console.error('💥 Erro inesperado:', err.message);
  }
}

checkConnection();