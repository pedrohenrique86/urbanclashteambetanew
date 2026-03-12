// Script para testar o fluxo de login
const fetch = require('node-fetch');

// Configuração
const API_URL = 'http://localhost:3001/api';

// Função para verificar se um email existe e está confirmado
async function checkEmail(email) {
  try {
    const response = await fetch(`${API_URL}/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Email: ${email}`);
    console.log(`Existe: ${data.exists}`);
    console.log(`Confirmado: ${data.confirmed}`);
    return data;
  } catch (error) {
    console.error('Erro ao verificar email:', error.message);
    return { exists: false, confirmed: false };
  }
}

// Função para tentar fazer login
async function attemptLogin(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log(`Tentativa de login com ${email}:`);
      console.log(`Falha: ${data.error || 'Erro desconhecido'}`);
      return { success: false, error: data.error };
    }

    console.log(`Login bem-sucedido com ${email}`);
    console.log('Token JWT recebido');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao tentar login:', error.message);
    return { success: false, error: error.message };
  }
}

// Função para testar o reenvio de confirmação
async function resendConfirmation(email) {
  try {
    const response = await fetch(`${API_URL}/auth/resend-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log(`Tentativa de reenvio para ${email}:`);
      console.log(`Falha: ${data.error || 'Erro desconhecido'}`);
      return { success: false, error: data.error };
    }

    console.log(`Reenvio bem-sucedido para ${email}`);
    console.log(data.message);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao reenviar confirmação:', error.message);
    return { success: false, error: error.message };
  }
}

// Função principal para testar o fluxo
async function testLoginFlow() {
  // Emails para teste
  const emails = [
    'usuario_existente_confirmado@example.com',  // Deve existir e estar confirmado
    'usuario_existente_nao_confirmado@example.com',  // Deve existir mas não estar confirmado
    'usuario_inexistente@example.com',  // Não deve existir
  ];

  // Testar verificação de email para cada caso
  console.log('\n===== TESTE DE VERIFICAÇÃO DE EMAIL =====');
  for (const email of emails) {
    console.log('\n----- Verificando email -----');
    await checkEmail(email);
  }

  // Testar tentativas de login
  console.log('\n===== TESTE DE TENTATIVAS DE LOGIN =====');
  
  // 1. Usuário existente e confirmado (deve funcionar com senha correta)
  console.log('\n----- Login com usuário confirmado -----');
  await attemptLogin('usuario_existente_confirmado@example.com', 'senha_correta');
  await attemptLogin('usuario_existente_confirmado@example.com', 'senha_incorreta');
  
  // 2. Usuário existente mas não confirmado (deve falhar)
  console.log('\n----- Login com usuário não confirmado -----');
  await attemptLogin('usuario_existente_nao_confirmado@example.com', 'qualquer_senha');
  
  // 3. Usuário inexistente (deve falhar)
  console.log('\n----- Login com usuário inexistente -----');
  await attemptLogin('usuario_inexistente@example.com', 'qualquer_senha');

  // Testar reenvio de confirmação
  console.log('\n===== TESTE DE REENVIO DE CONFIRMAÇÃO =====');
  
  // 1. Usuário existente e não confirmado (deve funcionar)
  console.log('\n----- Reenvio para usuário não confirmado -----');
  await resendConfirmation('usuario_existente_nao_confirmado@example.com');
  
  // 2. Usuário existente e já confirmado (deve falhar)
  console.log('\n----- Reenvio para usuário já confirmado -----');
  await resendConfirmation('usuario_existente_confirmado@example.com');
  
  // 3. Usuário inexistente (deve falhar)
  console.log('\n----- Reenvio para usuário inexistente -----');
  await resendConfirmation('usuario_inexistente@example.com');
}

// Executar o teste
testLoginFlow().catch(console.error);