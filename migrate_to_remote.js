const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase local
const localSupabaseUrl = 'http://127.0.0.1:54321';
const localSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Configuração do Supabase remoto (usando variáveis de ambiente)
const remoteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const remoteSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!remoteSupabaseUrl || !remoteSupabaseKey) {
  console.error('❌ As variáveis de ambiente do Supabase remoto não estão configuradas.');
  console.error('Por favor, crie um arquivo .env com as seguintes variáveis:');
  console.error('VITE_SUPABASE_URL=seu_url_supabase_remoto');
  console.error('SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_supabase_remoto');
  process.exit(1);
}

// Criar clientes Supabase
const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);
const remoteSupabase = createClient(remoteSupabaseUrl, remoteSupabaseKey);

// Função para migrar clãs
async function migrateClans() {
  try {
    console.log('🔍 Buscando clãs no banco de dados local...');
    
    // Buscar clãs do banco local
    const { data: localClans, error: localError } = await localSupabase
      .from('clans')
      .select('*');
    
    if (localError) {
      console.error('❌ Erro ao buscar clãs locais:', localError.message);
      return;
    }
    
    if (!localClans || localClans.length === 0) {
      console.log('⚠️ Nenhum clã encontrado no banco local!');
      return;
    }
    
    console.log(`✅ Encontrados ${localClans.length} clãs no banco local.`);
    
    // Inserir clãs no banco remoto
    console.log('🔄 Migrando clãs para o banco remoto...');
    
    // Remover IDs para permitir que o Supabase gere novos IDs
    const clansToInsert = localClans.map(({ id, created_at, ...rest }) => rest);
    
    const { data: insertedClans, error: insertError } = await remoteSupabase
      .from('clans')
      .upsert(clansToInsert, { onConflict: 'name' })
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir clãs no banco remoto:', insertError.message);
      return;
    }
    
    console.log(`✅ ${insertedClans.length} clãs migrados com sucesso!`);
    
  } catch (err) {
    console.error('💥 Erro inesperado:', err.message);
  }
}

// Função para migrar usuários
async function migrateUsers() {
  try {
    console.log('🔍 Buscando perfis de usuários no banco de dados local...');
    
    // Buscar perfis de usuários do banco local
    const { data: localProfiles, error: localError } = await localSupabase
      .from('user_profiles')
      .select('*');
    
    if (localError) {
      console.error('❌ Erro ao buscar perfis locais:', localError.message);
      return;
    }
    
    if (!localProfiles || localProfiles.length === 0) {
      console.log('⚠️ Nenhum perfil de usuário encontrado no banco local!');
      return;
    }
    
    console.log(`✅ Encontrados ${localProfiles.length} perfis de usuários no banco local.`);
    
    // Inserir perfis no banco remoto
    console.log('🔄 Migrando perfis para o banco remoto...');
    
    // Remover IDs e timestamps para permitir que o Supabase gere novos
    const profilesToInsert = localProfiles.map(({ id, created_at, updated_at, ...rest }) => rest);
    
    const { data: insertedProfiles, error: insertError } = await remoteSupabase
      .from('user_profiles')
      .upsert(profilesToInsert, { onConflict: 'user_id' })
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir perfis no banco remoto:', insertError.message);
      return;
    }
    
    console.log(`✅ ${insertedProfiles.length} perfis de usuários migrados com sucesso!`);
    
  } catch (err) {
    console.error('💥 Erro inesperado:', err.message);
  }
}

// Executar migração
async function migrateAll() {
  console.log('🚀 Iniciando migração do banco local para o remoto...');
  
  // Primeiro migrar clãs, depois usuários (devido às chaves estrangeiras)
  await migrateClans();
  await migrateUsers();
  
  console.log('✨ Migração concluída!');
}

migrateAll();