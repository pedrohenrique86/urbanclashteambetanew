// Script para atualizar referências à tabela user_profiles para users

const fs = require('fs');
const path = require('path');

// Arquivos a serem atualizados
const filesToUpdate = [
  'src/hooks/useUserProfile.ts',
  'src/hooks/useDashboardData.ts',
  'src/services/rankingService.ts',
  'src/pages/FactionSelectionPage.tsx',
  'src/components/AuthModal.tsx'
];

// Função para atualizar o conteúdo de um arquivo
function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(fullPath)) {
    console.error(`Arquivo não encontrado: ${fullPath}`);
    return;
  }
  
  // Ler o conteúdo do arquivo
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Substituir referências à tabela user_profiles por users
  const updatedContent = content.replace(/from\(['"]user_profiles['"]\)/g, "from('users')");
  
  // Verificar se houve alterações
  if (content !== updatedContent) {
    // Escrever o conteúdo atualizado no arquivo
    fs.writeFileSync(fullPath, updatedContent, 'utf8');
    console.log(`Arquivo atualizado: ${filePath}`);
  } else {
    console.log(`Nenhuma alteração necessária em: ${filePath}`);
  }
}

// Atualizar cada arquivo
filesToUpdate.forEach(updateFile);

console.log('Atualização concluída!');