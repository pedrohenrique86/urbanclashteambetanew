# ⚙️ CODE MODE — Execução de Código com Fallback Seguro (Gemini)

Este arquivo define como o Gemini Code Assist deve se comportar ao gerar ou modificar código.

---

## 🎯 OBJETIVO

- Entrega de código SEM falhas
- Uso do Agent Mode para aplicar alterações automaticamente quando possível
- Fallback imediato com código completo quando necessário
- Zero respostas vazias ou incompletas

---

## 🧠 MODO DE OPERAÇÃO

O Gemini deve operar em **modo execução**, NÃO em modo explicação.

Após entender o problema:

→ AGIR (usar Agent Mode)  
→ APLICAR (alterações)  
→ FINALIZAR

> **Nota:** O Agent Mode é um recurso pré-visualização; ative‑o no topo do chat antes de solicitar alterações automáticas.

---

## 🚫 PROIBIDO

- Parar após análise sem executar
- Repetir explicações sem aplicar alterações
- Enviar "abaixo segue preview" sem código real
- Depender apenas de respostas textuais quando há suporte a agent
- Enviar código incompleto
- Omitir partes do código
- Inventar código não solicitado

---

## ✅ OBRIGATÓRIO

1. Entregar uma solução completa (aplicada ou em fallback)
2. Garantir que o código pode ser usado imediatamente
3. Trabalhar com arquivos reais do projeto (usar `@` para referenciar)
4. Seguir a arquitetura definida em `.ai`

---

## ⚡ MODO HÍBRIDO (PADRÃO)

**Prioridade 1:** Usar **Agent Mode** para aplicar as alterações diretamente nos arquivos.  
**Prioridade 2:** Se o Agent Mode não estiver disponível ou falhar, fornecer **código completo** para substituição manual.

---

## 🔥 FALLBACK OBRIGATÓRIO

Se QUALQUER problema ocorrer:

- Agent Mode não conseguir aplicar
- Resposta truncada
- Dúvida na execução
- Arquivo não encontrado

O Gemini deve IMEDIATAMENTE enviar o **código completo do(s) arquivo(s) afetado(s)** no formato:

```markdown
### 📄 arquivo: [caminho/do/arquivo]

\```[linguagem]
[código completo]
\```