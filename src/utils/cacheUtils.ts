// Utilitários para limpeza de cache e estado da aplicação

export const clearAllCache = () => {
  console.log('🧹 Limpando todo o cache da aplicação...');
  
  // Limpar localStorage relacionado ao perfil
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('profile') || key.includes('user') || key.includes('clan'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`🗑️ Removendo cache: ${key}`);
    localStorage.removeItem(key);
  });
  
  // Limpar sessionStorage relacionado ao perfil
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('profile') || key.includes('user') || key.includes('clan'))) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    console.log(`🗑️ Removendo session cache: ${key}`);
    sessionStorage.removeItem(key);
  });
};

export const forceAppReload = () => {
  console.log('🔄 Forçando recarga completa da aplicação...');
  
  // Limpar cache primeiro
  clearAllCache();
  
  // Aguardar um pouco e então recarregar
  setTimeout(() => {
    window.location.replace(window.location.pathname);
  }, 100);
};

export const redirectToDashboardWithCleanup = () => {
  console.log('🎯 Redirecionando para dashboard com limpeza completa...');
  
  // Limpar cache
  clearAllCache();
  
  // Aguardar um pouco e então redirecionar
  setTimeout(() => {
    window.location.replace('/dashboard');
  }, 100);
};