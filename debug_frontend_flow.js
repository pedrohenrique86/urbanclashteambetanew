// Simulando o fluxo completo do frontend

const { JSDOM } = require('jsdom');

// Simulando o ambiente do navegador
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000/email-confirmation?token=test-token-1750647259803-r8yqi4'
});

global.window = dom.window;
global.document = dom.window.document;
global.location = dom.window.location;

// Simulando URLSearchParams
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

console.log('🌐 URL simulada:', window.location.href);
console.log('🔍 Search params:', window.location.search);
console.log('🎫 Token extraído:', token);
console.log('🎫 Token length:', token?.length);
console.log('🎫 Token type:', typeof token);

if (!token) {
  console.log('❌ Token não encontrado nos parâmetros da URL');
  process.exit(1);
}

if (token.length < 10) {
  console.log('❌ Token muito curto:', token);
  process.exit(1);
}

// Simulando a chamada da API
async function testApiCall() {
  const API_BASE_URL = 'http://localhost:3001/api';
  const endpoint = `/auth/confirm-email/${token}`;
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('🌐 URL da API que será chamada:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Status OK?', response.ok);
    
    const text = await response.text();
    console.log('📄 Response text:', text);
    
    let data;
    if (text) {
      try {
        data = JSON.parse(text);
        console.log('📄 Response JSON:', data);
      } catch (jsonError) {
        console.error('❌ Invalid JSON response:', text);
        return;
      }
    } else {
      data = {};
    }
    
    if (!response.ok) {
      console.log('❌ Response not OK');
      console.log('❌ Error:', data.error);
      return;
    }
    
    console.log('✅ Sucesso! Resposta da confirmação:', data);
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testApiCall();