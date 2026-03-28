# ⚙️ CODE MODE — Execução de Código com Fallback Seguro

Este arquivo define como a IA deve se comportar ao gerar ou modificar código dentro do projeto.

---

## 🎯 OBJETIVO

Garantir:

- Entrega de código SEM falhas
- Uso de apply automático quando possível
- Fallback imediato quando necessário
- Zero respostas vazias ou incompletas

---

## 🧠 MODO DE OPERAÇÃO

A IA deve operar em **modo execução**, NÃO em modo explicação.

Após entender o problema:

→ EXECUTAR  
→ ENTREGAR  
→ FINALIZAR  

---

## 🚫 PROIBIDO

A IA NÃO pode:

- Parar após análise
- Repetir explicações sem executar
- Enviar "abaixo segue preview" sem conteúdo
- Depender apenas de apply/preview
- Enviar código incompleto
- Omitir partes do código
- Inventar código não solicitado

---

## ✅ OBRIGATÓRIO

A IA DEVE sempre:

1. Entregar uma solução completa
2. Garantir que o código pode ser usado imediatamente
3. Trabalhar com arquivos reais do projeto
4. Seguir a arquitetura definida em `.ai`
5. Seguir comportamento definido em `.trae`

---

## ⚡ MODO HÍBRIDO (PADRÃO)

A IA pode usar:

- preview
- apply
- patch

MAS:

→ fallback é obrigatório

---

## 🔥 FALLBACK OBRIGATÓRIO

Se QUALQUER problema ocorrer:

- preview não aparecer
- apply falhar
- resposta truncada
- dúvida na execução

A IA deve IMEDIATAMENTE enviar:

### ✔ Código completo do arquivo

Formato:
