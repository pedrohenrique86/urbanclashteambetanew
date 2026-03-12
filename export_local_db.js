const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuração
const outputDir = path.join(__dirname, 'db_export');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(outputDir, `postgres_export_${timestamp}.sql`);

// Criar diretório de saída se não existir
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 Iniciando exportação do banco de dados local...');

// Comando para exportar o banco de dados local
const command = 'supabase db dump -f sql';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Erro ao executar o comando: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`⚠️ Aviso: ${stderr}`);
  }
  
  // Salvar a saída em um arquivo
  fs.writeFileSync(outputFile, stdout);
  
  console.log(`✅ Exportação concluída! Arquivo salvo em: ${outputFile}`);
  console.log('\n📋 Instruções para importar no Supabase remoto:');
  console.log('1. Acesse o painel de administração do Supabase');
  console.log('2. Vá para a seção "SQL Editor"');
  console.log('3. Crie uma nova consulta');
  console.log('4. Cole o conteúdo do arquivo exportado');
  console.log('5. Execute a consulta');
  
  // Adicionar ao .gitignore se ainda não estiver
  const gitignorePath = path.join(__dirname, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('db_export/')) {
      fs.appendFileSync(gitignorePath, '\n# Database exports\ndb_export/\n');
      console.log('\n✅ Diretório db_export/ adicionado ao .gitignore');
    }
  }
});