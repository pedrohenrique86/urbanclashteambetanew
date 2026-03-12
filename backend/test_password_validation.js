const { body, validationResult } = require('express-validator');

// Simular um objeto req para teste
function createMockReq(password) {
  return {
    body: {
      token: 'test-token',
      password: password
    }
  };
}

// Função para testar validação
async function testPasswordValidation() {
  console.log('🔄 Testando validação de senhas...');
  
  const passwordValidation = body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo');
  
  const testPasswords = [
    'NovaSenh@123',  // Válida
    'senha123',      // Sem maiúscula e símbolo
    'SENHA123!',     // Sem minúscula
    'SenhaForte!',   // Sem número
    'SenhaForte123', // Sem símbolo
    'Senh@1'         // Muito curta
  ];
  
  for (const password of testPasswords) {
    console.log(`\n🔐 Testando senha: "${password}"`);
    
    const req = createMockReq(password);
    
    // Aplicar validação
    await passwordValidation.run(req);
    
    // Verificar erros
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      console.log('✅ Senha válida!');
    } else {
      console.log('❌ Senha inválida:');
      errors.array().forEach(error => {
        console.log(`   - ${error.msg}`);
      });
    }
  }
  
  console.log('\n🎉 Teste de validação finalizado!');
}

testPasswordValidation().catch(console.error);