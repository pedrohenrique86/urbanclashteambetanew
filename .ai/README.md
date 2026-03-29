# 📂 Contexto do Projeto para Gemini Code Assist

Esta pasta contém os arquivos de contexto que orientam o Gemini Code Assist a entender e trabalhar no projeto **Urban Clash Team**.

## Arquivos

- `PROJECT_CONTEXT.md` – Visão geral, stack, estrutura de pastas e resumo dos arquivos centrais.
- `DECISIONS.md` – Decisões arquiteturais (ADR), padrões de código e lista detalhada de arquivos centrais.
- `CODE_MODE.md` – Define o comportamento da IA: modo execução, sem explicações, fallback com código completo.
- `NEXT_STEPS.md` – Estado atual da tarefa e próximos passos (atualize sempre que uma etapa for concluída).

## Como usar

1. **No início de uma nova conversa** (ou quando quiser resetar o contexto), cole o prompt abaixo no chat do Gemini Code Assist:
@.ai/PROJECT_CONTEXT.md @.ai/DECISIONS.md @.ai/CODE_MODE.md @.ai/NEXT_STEPS.md

Siga as regras do CODE_MODE.md: execute sem explicações, apenas me dê um resumo final do que foi alterado.

2. Após enviar essa mensagem, o Gemini terá todo o contexto carregado. Você pode então fazer pedidos específicos, como:

- “Crie um novo serviço de ranking no backend seguindo a arquitetura de serviços.”
- “Adicione um botão de ‘Sair do clã’ na página do clã.”
- “Atualize o NEXT_STEPS.md após concluir a tarefa.”

3. **Ative o Agent Mode** no topo do chat quando quiser que as alterações sejam aplicadas automaticamente nos arquivos.

4. **Atualize o NEXT_STEPS.md** sempre que uma tarefa for concluída ou quando o estado mudar, para manter o contexto alinhado.

## Manutenção

- Mantenha os arquivos de contexto sempre atualizados com a realidade do projeto.
- Commit no Git para compartilhar com outros ambientes (casa/trabalho).

---
