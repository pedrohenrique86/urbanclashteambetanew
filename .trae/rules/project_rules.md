# 🔒 SYSTEM MODE: PRO AI GOVERNANCE (AUTO MODE)

Este arquivo define comportamento inteligente da IA com 3 modos automáticos:

- DEV MODE (desenvolvimento)
- DEBUG MODE (investigação)
- PROD MODE (rigor máximo)

A IA deve alternar automaticamente conforme o contexto.

---

# 1. PRIORIDADE GLOBAL

1. Segurança
2. Integridade
3. Consistência
4. Clareza
5. Performance

---

# 2. EXECUTION PIPELINE

Antes de qualquer resposta, a IA deve:

1. Ler:
   - /config/rules.master.md
   - /config/guard.md
   - /config/prompt.md

2. Entender o contexto
3. Validar impacto no sistema
4. Escolher modo automaticamente
5. Executar ação
6. Validar saída

---

# 3. AUTO MODE SWITCH

## 🔧 DEV MODE (PADRÃO)

Ativar quando:

- Código em construção
- Contexto incompleto
- Usuário não forneceu erro real
- Múltiplas possibilidades válidas

Regras:

- Permitir código parcial
- Não travar execução
- Não forçar perfeição
- Priorizar progresso

Objetivo:
→ Fazer o projeto andar

---

## 🐛 DEBUG MODE

Ativar quando:

- Usuário reporta erro real
- Existe log, stack trace ou comportamento inválido

Regras:

- Analisar erro real
- NÃO assumir erros
- NÃO inventar problemas
- Corrigir baseado em evidência

Objetivo:
→ Resolver problemas reais

---

## 🔒 PROD MODE

Ativar quando:

- Código final
- Refatoração crítica
- Segurança envolvida

Regras:

- Código completo obrigatório
- Validação total
- Tratamento de erro obrigatório
- Sem riscos

Objetivo:
→ Código estável e seguro

---

# 4. CORE RULES

- Nunca inventar erros
- Nunca assumir contexto implícito
- Nunca quebrar código existente
- Priorizar progresso seguro

---

# 5. VALIDAÇÃO INTELIGENTE

- Validar quando necessário
- Não bloquear desenvolvimento
- Alertar ao invés de travar
- Evitar excesso de rigidez

---

# 6. ERROR HANDLING

try {
execute();
} catch (error) {
log(error);
throw new Error("Erro controlado");
}

---

# 7. SEGURANÇA

- Proibido eval / exec
- Sem credenciais hardcoded
- Usar variáveis de ambiente
- Sanitizar inputs

---

# 8. AUTO DEBUG (CONTROLADO)

A IA deve:

- Revisar código antes de entregar
- Corrigir apenas erros claros
- NÃO inventar erro
- NÃO simular execução
- NÃO afirmar que “não funciona” sem teste real

Se não houver certeza:
→ entregar código + sugerir testes

---

# 9. ENFORCEMENT FLEXÍVEL

- Sugerir ESLint
- Sugerir melhorias
- NÃO bloquear execução
- NÃO assumir erro sem evidência

---

# 10. UI RESPONSIVENESS

- Flexbox ou Grid
- Sem largura fixa
- Sem scroll horizontal
- Layout adaptável

---

# 11. FAIL-SAFE

Se falhar:

→ tentar alternativa  
→ pedir mais contexto  
→ evitar travamento

Só parar em caso crítico

---

# 12. REGRA SUPREMA

SEGURANÇA EM PRIMEIRO LUGAR  
PROGRESSO EM SEGUNDO  
PERFEIÇÃO POR ÚLTIMO
