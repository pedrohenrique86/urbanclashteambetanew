# Status e Próximos Passos

Este documento resume o estado atual do projeto, as tarefas concluídas, as que estão em andamento e os próximos passos planejados.

## O que já foi feito

1.  **Refatoração do Cronômetro do Jogo (`useGameClock.ts`)**:
    *   A lógica do cronômetro foi migrada de `requestAnimationFrame` para `setInterval` para garantir uma contagem de tempo mais estável e prevenir desvios em relação ao servidor.
    *   A sincronização inicial agora utiliza `endTime` e `startTime` fornecidos pelo backend, com a contagem subsequente ocorrendo localmente no frontend.

2.  **Correção da Sincronização do Ranking (`useRankingCache.ts`)**:
    *   Foi resolvido um bug de "stale closure" que impedia a atualização automática da tabela de ranking via Server-Sent Events (SSE).
    *   O código foi limpo, removendo variáveis não utilizadas (`globalPromiseLimited`, `globalPromiseFull`) e diretivas ESLint obsoletas.

3.  **Restauração e Desacoplamento da Hora do Servidor**:
    *   A exibição da hora do servidor, que havia sido perdida, foi restaurada na interface do usuário (`GameClockDisplay.tsx`).
    *   A lógica de atualização da hora do servidor foi desacoplada do estado do jogo (`gameState`). Agora, a hora é sincronizada uma vez via Socket.IO no carregamento e continua a ser atualizada localmente, de forma independente e contínua, mesmo quando não há uma rodada de jogo ativa.
    *   A exibição foi formatada para mostrar os fusos horários BRT e UTC.

## O que ficou parcialmente feito

1.  **Renomeação dos Itens do Menu Lateral**:
    *   A tarefa de renomear os menus na barra lateral foi iniciada. O arquivo `frontend/src/components/constants/menuItems.ts` foi identificado como a fonte da verdade para os nomes e a estrutura do menu.
    *   As alterações para remover a categoria "Principal" e renomear "Jogo" para "Operações", "Atividades" para "Economia", "Social" para "Rede" e "Premium" para "Elite" já foram propostas e estão prontas para serem aplicadas.

## O que ainda falta

1.  **Aplicar as Mudanças no Menu (`menuItems.ts`)**:
    *   As modificações propostas no arquivo `menuItems.ts` precisam ser efetivamente aplicadas para oficializar as novas nomenclaturas das categorias do menu.

2.  **Atualizar a Renderização do Menu (`Sidebar.tsx`)**:
    *   O componente `Sidebar.tsx` precisa ser atualizado para consumir as novas categorias definidas em `menuItems.ts`.
    *   Um novo ícone de "dashboard" (casa) precisa ser adicionado no topo da barra lateral, acima das categorias de menu existentes.

## Próximo Passo Exato

1.  **Modificar o arquivo `frontend/src/components/constants/menuItems.ts`**: Aplicar o `diff` proposto para remover a categoria "Principal" e renomear as demais categorias conforme solicitado.