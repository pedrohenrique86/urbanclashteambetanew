# 🔒 SYSTEM MODE: STRICT AI GOVERNANCE (MASTER)

Este arquivo é um CONTRATO obrigatório de execução.

Todas as regras abaixo são:

- Globais
- Invioláveis
- Obrigatórias em 100% das execuções

Quebrar qualquer regra invalida a resposta.

---

# 1. PRIORIDADE MÁXIMA

Ordem obrigatória:

1. Segurança
2. Consistência
3. Integridade do sistema
4. Clareza
5. Performance

---

# 2. EXECUTION PIPELINE (OBRIGATÓRIO)

Antes de QUALQUER resposta, a IA DEVE executar:

1. Ler obrigatoriamente:
   - /config/rules.master.md
   - /config/guard.md
   - /config/prompt.md

2. Entender a tarefa completamente

3. Validar:
   - contexto
   - impacto no sistema existente
   - dependências

4. Aplicar regras obrigatórias:
   - validação de input
   - tratamento de erro
   - segurança

5. Executar modo correto:
   - GENERATE → criar código completo
   - REVIEW → revisar tudo
   - FIX → corrigir tudo

6. Validar saída final:
   - sem erros
   - sem código incompleto
   - sem quebra de sistema
   - compatível com código existente

Se qualquer etapa falhar:
→ PARAR
→ RETORNAR ERRO

---

# 3. CORE RULES

- Nunca assumir contexto implícito
- Nunca gerar código incompleto
- Nunca usar dados fictícios em produção
- Nunca quebrar código existente
- Nunca ignorar validação

---

# 4. INPUT VALIDATION (OBRIGATÓRIO)

if (!input || typeof input !== "string") {
throw new Error("Entrada inválida");
}

---

# 5. ERROR HANDLING (OBRIGATÓRIO)

try {
validateInputs();
executeAction();
} catch (error) {
logError(error);
throw new Error("Erro controlado na execução");
}

---

# 6. SAFE EXECUTION

if (!preConditionsMet()) {
throw new Error("Pré-condições não atendidas");
}

---

# 7. RETRY PATTERN

for (let i = 0; i < MAX\*RETRIES; i++) {
try {
return await operation();
} catch (e) {
await delay(2 \*\* i \_ 100);
}
}
throw new Error("Falha após múltiplas tentativas");

---

# 8. LOGGING (OBRIGATÓRIO)

log({
level: "INFO",
message: "Descrição clara",
context: {}
});

---

# 9. SEGURANÇA

- Proibido eval / exec
- Nunca usar credenciais hardcoded
- Usar variáveis de ambiente
- Sanitizar TODAS entradas
- Princípio do menor privilégio

---

# 10. VALIDAÇÃO COMPLETA

- Validar input
- Validar estado
- Validar permissões
- Validar recursos

Falhou → PARAR

---

# 11. EXECUÇÃO SEGURA

- Timeout obrigatório
- Evitar loops infinitos
- Suporte a cancelamento
- Nunca continuar após erro crítico

---

# 12. RUNTIME ERROR FORMAT

{
"error": true,
"message": "Descrição clara",
"code": "ERROR_CODE"
}

---

# 13. ENFORCEMENT AUTOMÁTICO

- ESLint sem erros
- TypeScript compilando
- Código validado antes de rodar
- Código validado antes de commit

Se falhar → BLOQUEAR

---

# 14. CODE VALIDATION GATE

1. ESLint OK
2. TypeScript OK
3. Sem código quebrado

Senão → BLOQUEAR

---

# 15. DOCUMENTAÇÃO

Toda função deve conter:

- propósito
- parâmetros
- retorno
- exemplo

---

# 16. ENGENHARIA

- KISS
- SOLID
- YAGNI

---

# 17. ANTI-ALUCINAÇÃO

Nunca inventar dados.

Se não souber:
throw new Error("Informação insuficiente");

---

# 18. FAIL-SAFE

1. Parar
2. Logar
3. Retornar erro
4. Pedir dados

---

# 19. GUARD RULES

- Ler código existente
- Validar impacto
- Evitar regressão

Proibido:

- Remover funcionalidades sem justificativa
- Alterar comportamento silenciosamente

Obrigatório:

- Manter compatibilidade
- Validar inputs
- Tratar erros

---

# 20. AI STRICT MODE

- Nunca gerar código incompleto
- Sempre incluir validação, erro e tipagem

Se não conseguir → ERRO

---

# 21. EXECUTION MODES

GENERATE → código completo
REVIEW → detectar e corrigir bugs
FIX → corrigir sem quebrar

---

# 22. SYSTEM CONTROL

- Nunca usar any
- Sempre usar try/catch
- Sempre validar input

---

# 23. UI RESPONSIVENESS (OBRIGATÓRIO)

- Mobile-first
- Flexbox ou Grid
- Unidades relativas
- Proibido largura fixa
- Sem scroll horizontal
- Touch-friendly

Se não for responsivo → BLOQUEAR

---

# 24. REGRA SUPREMA

SEGURANÇA SEMPRE EM PRIMEIRO LUGAR

---

# 25. AUTO DEBUG (CONTROLADO)

A IA deve:

1. Sempre revisar o código antes de enviar
2. Corrigir erros óbvios automaticamente
3. Evitar suposições sem evidência

REGRAS IMPORTANTES:

- NÃO afirmar que o código "não funciona" sem execução real
- NÃO inventar erros hipotéticos
- Só corrigir se houver evidência clara no código
- Priorizar estabilidade sobre mudanças desnecessárias

FLUXO:

1. Gerar código
2. Revisar lógica
3. Corrigir apenas erros concretos
4. Entregar versão final limpa

SE NÃO HOUVER CERTEZA DE ERRO:
→ Entregar o código e sugerir testes, sem afirmar falha

OBJETIVO:
Código funcional, sem paranoia de erro.

---

# 26. DEV MODE (AUTOMÁTICO)

A IA deve tentar resolver corretamente primeiro.

Se não houver solução clara ou houver bloqueios:
→ Ativar DEV MODE automaticamente

DEV MODE permite:

- Código parcial
- Testes rápidos
- Aproximações práticas
- Foco em fazer funcionar

Mesmo em DEV MODE:

- Não inventar erros
- Não travar o fluxo

---

## FLUXO OBRIGATÓRIO

A IA deve seguir exatamente esta ordem:

1. TENTAR modo estrito (STRICT MODE)
2. TENTAR corrigir erros
3. TENTAR inferir contexto com segurança
4. TENTAR múltiplas abordagens

Se TODAS falharem:

→ ATIVAR FALLBACK MODE

---

## REGRAS DO FALLBACK MODE

Quando ativado:

- Permitir código parcial
- Permitir suposições controladas
- Reduzir rigidez de validação estrutural
- Priorizar entrega funcional

---

## RESTRIÇÕES ABSOLUTAS

Mesmo em fallback:

- NUNCA ignorar segurança crítica
- NUNCA usar código inseguro
- NUNCA usar eval / exec
- NUNCA ignorar validação básica de input

---

## OBRIGAÇÃO DE TRANSPARÊNCIA

Ao ativar fallback, a IA DEVE informar:

"Fallback Mode ativado devido a limitações de contexto ou execução."

---

## PRIORIDADE

STRICT MODE sempre tem prioridade.

FALLBACK MODE só existe como último recurso.
