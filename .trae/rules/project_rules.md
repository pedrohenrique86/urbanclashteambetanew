# 🔒 SYSTEM MODE: STRICT AI GOVERNANCE (MASTER)

Este arquivo é um CONTRATO obrigatório de execução.

Todas as regras abaixo são:

- Globais
- Invioláveis
- Obrigatórias em 100% das execuções

Quebrar qualquer regra invalida a resposta.

---

# 1. PRIORIDADE MÁXIMA

1. Segurança
2. Consistência
3. Integridade do sistema
4. Clareza
5. Performance

---

# 2. EXECUTION PIPELINE (OBRIGATÓRIO)

Antes de QUALQUER resposta, a IA DEVE:

1. Ler:
   - /config/rules.master.md
   - /config/guard.md
   - /config/prompt.md

2. Validar contexto, impacto e dependências
3. Aplicar validação, segurança e tratamento de erro
4. Executar modo correto (GENERATE / REVIEW / FIX)
5. Validar saída final

Se falhar → PARAR

---

# 3. CORE RULES

- Nunca assumir contexto implícito
- Nunca gerar código incompleto
- Nunca quebrar código existente
- Nunca ignorar validação

---

# 4. PADRÕES OBRIGATÓRIOS

## Input

if (!input || typeof input !== "string") throw new Error("Entrada inválida");

## Error Handling

try {
validateInputs();
executeAction();
} catch (error) {
logError(error);
throw new Error("Erro controlado");
}

## Safe Execution

if (!preConditionsMet()) throw new Error("Pré-condições não atendidas");

## Retry

for (let i = 0; i < MAX_RETRIES; i++) {
try { return await operation(); }
catch { await delay(2 \*_ i _ 100); }
}

---

# 5. SEGURANÇA

- Proibido eval / exec
- Sem credenciais hardcoded
- Usar env
- Sanitizar inputs

---

# 6. VALIDAÇÃO

Validar:

- input
- estado
- permissões
- recursos

Falhou → PARAR

---

# 7. EXECUÇÃO SEGURA

- Timeout
- Evitar loops infinitos
- Não continuar após erro

---

# 8. ERROR FORMAT

{
"error": true,
"message": "Descrição clara",
"code": "ERROR_CODE"
}

---

# 9. ENFORCEMENT

- ESLint OK
- TypeScript OK
- Sem erro → roda
- Com erro → BLOQUEAR

---

# 10. DOCUMENTAÇÃO

Toda função:

- propósito
- parâmetros
- retorno
- exemplo

---

# 11. ENGENHARIA

- KISS
- SOLID
- YAGNI

---

# 12. ANTI-ALUCINAÇÃO

Nunca inventar dados.

Se não souber:
throw new Error("Informação insuficiente");

---

# 13. FAIL-SAFE

1. Parar
2. Logar
3. Retornar erro
4. Pedir dados

---

# 14. GUARD RULES

- Ler código existente
- Validar impacto
- Evitar regressão

---

# 15. AI STRICT MODE

- Sempre validação
- Sempre try/catch
- Nunca código incompleto

---

# 16. UI RESPONSIVENESS

- Mobile-first
- Flex/Grid
- Sem largura fixa
- Sem scroll horizontal

---

# 17. AUTO DEBUG

- Revisar antes de entregar
- Corrigir erros claros
- Não inventar erro

---

# 18. DEV MODE (AUTOMÁTICO)

Se não resolver em modo estrito:
→ liberar código parcial e pragmático

Nunca quebrar segurança

---

# 19. FALLBACK MODE

Ativado apenas se tudo falhar

- Permite aproximações
- Deve avisar: "Fallback Mode ativado"

---

# REGRA SUPREMA

SEGURANÇA SEMPRE EM PRIMEIRO LUGAR
