// Testando se há problemas de codificação de URL

const token = 'test-token-1750647259803-r8yqi4';
const testUrl = `http://localhost:3000/email-confirmation?token=${token}`;

console.log('🔗 URL original:', testUrl);
console.log('🎫 Token original:', token);
console.log('🎫 Token length:', token.length);

// Testando codificação
const encodedToken = encodeURIComponent(token);
console.log('🔐 Token codificado:', encodedToken);
console.log('🔐 Token codificado length:', encodedToken.length);

// Testando decodificação
const decodedToken = decodeURIComponent(encodedToken);
console.log('🔓 Token decodificado:', decodedToken);
console.log('🔓 Token decodificado length:', decodedToken.length);

// Verificando se são iguais
console.log('✅ Tokens são iguais?', token === decodedToken);

// Testando URL completa
const urlWithEncodedToken = `http://localhost:3000/email-confirmation?token=${encodedToken}`;
console.log('🔗 URL com token codificado:', urlWithEncodedToken);

// Simulando extração do token da URL como o frontend faria
const url = new URL(testUrl);
const extractedToken = url.searchParams.get('token');
console.log('🎯 Token extraído da URL:', extractedToken);
console.log('🎯 Token extraído length:', extractedToken?.length);
console.log('✅ Token extraído é igual ao original?', token === extractedToken);

// Testando caracteres especiais
console.log('🔍 Caracteres do token:');
for (let i = 0; i < token.length; i++) {
  const char = token[i];
  const code = char.charCodeAt(0);
  console.log(`  [${i}]: '${char}' (${code})`);
}