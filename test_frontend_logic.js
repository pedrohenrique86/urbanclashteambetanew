// Teste da lógica do frontend
const response = {
  "message": "Email confirmado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1f1845f5-34ff-4c22-8384-76af4a278b5a",
    "email": "test-1750646038694@example.com",
    "username": "testuser1750646038694"
  },
  "redirectTo": "/faction-selection"
};

console.log('🧪 Testando lógica do frontend...');
console.log('✅ Resposta da confirmação:', response);
console.log('✅ Tipo da resposta:', typeof response);
console.log('✅ Response.message:', response.message);
console.log('✅ Response.redirectTo:', response.redirectTo);
console.log('✅ Response.token:', response.token ? 'Token presente' : 'Token ausente');

// Testar as condições
if (response.message && (response.message.includes('confirmado com sucesso') || response.message === 'Email confirmado com sucesso')) {
  console.log('✅ Sucesso detectado pela mensagem');
  console.log('✅ Condição 1: PASSOU');
} else if (response.redirectTo) {
  console.log('✅ Sucesso detectado pelo redirectTo');
  console.log('✅ Condição 2: PASSOU');
} else {
  console.log('❌ Nenhuma condição de sucesso atendida');
  console.log('❌ Response completa:', JSON.stringify(response, null, 2));
}

// Testar cada condição individualmente
console.log('\n🔍 Testando condições individuais:');
console.log('response.message existe?', !!response.message);
console.log('response.message inclui "confirmado com sucesso"?', response.message && response.message.includes('confirmado com sucesso'));
console.log('response.message é igual a "Email confirmado com sucesso"?', response.message === 'Email confirmado com sucesso');
console.log('response.redirectTo existe?', !!response.redirectTo);