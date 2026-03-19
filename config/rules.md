# 🔒 Regras de Governança da Instância de IA

Estas regras são obrigatórias, globais e inegociáveis.  
Devem ser seguidas em 100% das execuções, sem exceções.

O não cumprimento de qualquer regra invalida a execução.

---

# 1. Princípios Globais de Execução

- Nunca assumir contexto implícito — tudo deve ser validado.
- Nunca executar ações destrutivas sem validação explícita.
- Nunca usar dados fictícios, mockados ou suposições em produção.
- Priorizar sempre:
  1. Segurança
  2. Consistência
  3. Clareza
  4. Performance

---

# 2. Padrões Obrigatórios de Código (MANDATORY PATTERNS)

## Error Handling Pattern
```js
try {
  validateInputs();
  executeAction();
} catch (error) {
  logError(error);
  handleFailure(error);
  throw new Error("Erro controlado na execução");
}
```

## Input Validation Pattern
```js
if (!input || typeof input !== "string") {
  throw new Error("Entrada inválida");
}
```

## Safe Execution Pattern
```js
if (!preConditionsMet()) {
  throw new Error("Pré-condições não atendidas");
}
```

## Retry Pattern
```js
for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    return await operation();
  } catch (e) {
    await delay(2 ** i * 100);
  }
}
throw new Error("Falha após múltiplas tentativas");
```

## Logging Pattern
```js
log({
  level: "INFO",
  message: "Descrição clara",
  context: {}
});
```

---

# 3. UI Responsiveness Rule

- Mobile-first obrigatório
- Layout adaptável (Flexbox ou Grid)
- Proibido largura fixa
- Usar unidades relativas
- Sem scroll horizontal
- Touch-friendly

---

# 4. Segurança

- Proibido eval, exec ou comandos inseguros
- Validar, sanitizar e tipar todas entradas
- Nunca usar credenciais hardcoded
- Usar variáveis de ambiente
- Princípio do menor privilégio

---

# 5. Validação

- Validar entrada
- Validar estado
- Validar permissões
- Validar recursos

Falhou = parar execução

---

# 6. Execução

- Timeout obrigatório
- Suporte a cancelamento
- Evitar loops infinitos
- Respeitar recursos

---

# 7. Documentação

Toda função deve conter:
- propósito
- parâmetros
- retorno
- exemplo

---

# 8. Tarefas

- Claras e rastreáveis
- Com responsável
- Com dependências

Ambiguidade = escalar

---

# 9. Testes

- Unitário + integração
- Cobertura mínima 85%
- CI/CD obrigatório

---

# 10. Logs

- Toda ação logada
- INFO, WARN, ERROR
- Com contexto e timestamp

---

# 11. Mudanças

- Versão
- Justificativa
- Impacto
- Rollback

---

# 12. Engenharia

KISS, YAGNI, SOLID obrigatórios

---

# 13. Anti-Alucinação

Nunca inventar dados

Se não souber:
```js
throw new Error("Informação insuficiente");
```

---

# 14. Fail-Safe

Se houver erro ou dúvida:

1. Parar
2. Logar
3. Retornar erro
4. Pedir dados

---

# REGRA SUPREMA

Segurança sempre em primeiro lugar

# 15. Enforcement Automático (EXECUTION LAYER)

Estas regras NÃO são apenas diretrizes.

Elas devem ser automaticamente aplicadas via:

- ESLint (validação estática)
- TypeScript (tipagem obrigatória)
- Scripts de validação (pré-execução)
- Hooks de commit (bloqueio de erro)

Regras:

- Código com erro NÃO deve rodar
- Código com erro NÃO deve ser commitado
- Código sem validação NÃO deve ser aceito

# 16. Runtime Protection

Toda execução deve:

- Validar entrada antes de processar
- Interromper execução em caso de erro
- Nunca continuar após falha crítica
- Sempre retornar erro estruturado

Formato obrigatório de erro:

{
  "error": true,
  "message": "Descrição clara",
  "code": "ERROR_CODE"
}

# 17. Code Validation Gate

Antes de qualquer execução:

1. ESLint deve passar
2. TypeScript deve compilar
3. Testes devem passar

Caso contrário:
EXECUÇÃO BLOQUEADA

# 18. AI Strict Mode

Toda IA deve:

- Seguir este arquivo como contrato
- Validar antes de responder
- Nunca gerar código incompleto
- Sempre incluir:
  - validação
  - tratamento de erro
  - tipagem

Se não conseguir:
RETORNAR ERRO





