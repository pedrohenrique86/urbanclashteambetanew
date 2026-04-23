# 📐 Registro de Decisões de Arquitetura (ADR) — UrbanClash Team

> Este documento define as decisões técnicas, padrões e convenções do projeto.  
> **Sempre que for desenvolver novas funcionalidades ou refatorar código, consulte este ADR** para garantir alinhamento com a arquitetura estabelecida.

---

## 1. Decisões Arquiteturais

- **Estrutura de Monorepo:** O projeto é organizado em um monorepo com workspaces distintos para `frontend` e `backend`. A orquestração é feita via `npm` na raiz, utilizando `concurrently` para gerenciar os processos de desenvolvimento simultaneamente.

- **Stack Tecnológica:**
  - **Frontend:** React com TypeScript e Vite como bundler. Esta combinação oferece excelente performance de desenvolvimento (com Hot Module Replacement) e a segurança de tipos do TypeScript.
  - **Backend:** Node.js com Express.js, uma escolha clássica, minimalista e performática para a construção de APIs RESTful.

- **Banco de Dados:** PostgreSQL é o banco de dados relacional principal. A interação é feita diretamente com o driver `pg`, o que proporciona controle total sobre as queries SQL, sem a abstração de um ORM.

- **Migrações de Schema:** As migrações do banco de dados são gerenciadas pela biblioteca `node-pg-migrate`, garantindo um versionamento explícito e controlado do schema da base de dados.

- **Comunicação em Tempo Real Híbrida:** A aplicação utiliza uma abordagem híbrida. **Server-Sent Events (SSE)** são empregados para streams leves e unidirecionais do servidor para o cliente (ex: atualizações de estado do jogador), garantindo eficiência de banda. **WebSockets (`socket.io`)** são reservados para interações que exigem comunicação bidirecional de baixa latência e broadcast global.

- **Cache e Dados Voláteis:** Redis é utilizado como um armazenamento de dados em memória, principalmente para sessões e dados de acesso rápido. A integração é feita via `@upstash/redis`.

- **Containerização:** Docker e `docker-compose` são utilizados para padronizar e orquestrar o ambiente de desenvolvimento, incluindo serviços essenciais como PostgreSQL e Redis.

---

## 2. Padrões de Código

- **Backend - Arquitetura em Camadas:** A lógica de negócio é organizada em uma arquitetura de camadas, separando `routes` (controladores), `services` (lógica de negócio) e acesso a dados, promovendo a separação de responsabilidades.

- **Backend - Padrão de Middleware:** O Express utiliza middlewares de forma extensiva para tarefas transversais como autenticação (`middleware/auth.js`), logging de requisições (`morgan`), e segurança (`helmet`, `cors`).

- **Frontend - Arquitetura de Componentes:** A interface do usuário é construída com base em componentes React reutilizáveis, organizados de forma clara em `src/components`.

- **Frontend - Gerenciamento de Estado e Dados:** O estado local é gerenciado por hooks nativos do React (`useState`, `useEffect`). Para o fetching de dados do servidor, `swr` é o padrão, oferecendo uma estratégia eficiente de "stale-while-revalidate" para cache e revalidação automática.

- **Frontend - Estilização:** A estilização é feita primariamente com Tailwind CSS. O tema segue a diretriz **Military Cyberpunk**, utilizando paletas táticas (Olive, Charcoal, Sand), fontes Orbitron/Stencil, e elementos visuais robustos (chanfros, scanlines, listras de aviso).

- **Frontend - Path Aliasing:** Para evitar imports relativos complexos (como `../../../`), foram configurados aliases de caminho no `vite.config.ts` e `tsconfig.json`, permitindo imports mais limpos (ex: `@/components/*`).

---

## 3. Convenções Importantes

- **Gerenciador de Pacotes:** `npm` é o gerenciador de pacotes padrão. A instalação de todas as dependências do monorepo deve ser feita com `npm run install:all` a partir da raiz.

- **Variáveis de Ambiente:** A configuração de ambiente é gerenciada por arquivos `.env`, carregados pelo pacote `dotenv`. Arquivos `.env` são estritamente locais e não devem ser versionados (`.gitignore`).

- **Proxy de API:** No ambiente de desenvolvimento, o frontend não utiliza um proxy configurado no Vite. As chamadas de API são feitas diretamente para o endereço do backend, que deve ser configurado corretamente via variáveis de ambiente.

- **Qualidade de Código:**
  - **Linting:** ESLint é mandatório e está configurado para JavaScript e TypeScript, garantindo um padrão de código consistente.
  - **Hooks de Git:** `Husky` é utilizado para rodar scripts de validação (como `lint`) antes de cada `commit`, prevenindo a introdução de código com problemas.

- **Scripts de Validação:** Os comandos `predev` e `prebuild` nos `package.json` garantem que as validações de lint e tipo sejam executadas antes de iniciar o servidor de desenvolvimento ou de gerar um build, funcionando como um portão de qualidade (quality gate).

---

## 4. Regras Implícitas do Projeto

- **Prioridade à Segurança:** O arquivo `config/rules.master.md` define "Segurança" como a prioridade máxima. Isso se reflete no uso de `helmet`, `express-rate-limit`, validação de entrada com `express-validator` e autenticação robusta com JWT.

- **TypeScript Estrito:** O frontend opera com a flag `"strict": true` no `tsconfig.json`. Código que não adere às regras estritas de tipo não será compilado.

- **Imutabilidade e Previsibilidade:** O uso de `swr` e React Hooks no frontend favorece padrões de imutabilidade e um fluxo de dados unidirecional.

- **Testes:** Embora a cobertura de testes não tenha sido totalmente analisada, a presença de `jest` e `supertest` no backend indica a intenção de que a lógica de negócio e os endpoints da API sejam testados.

---

## 5. Arquivos Centrais do Projeto (para orientação do agente)

Para que o assistente (Gemini Code Assist) entenda rapidamente a espinha dorsal do projeto, estes são os arquivos mais importantes e seus papéis:

### Backend
| Arquivo | Responsabilidade |
|---------|------------------|
| `backend/server.js` | Ponto de entrada do servidor Express. Configura middlewares, rotas e inicializa o servidor e o Socket.IO. |
| `backend/config/database.js` | Configuração da conexão com o PostgreSQL (criação do pool de conexões). |
| `backend/config/redisClient.js` | Configuração do cliente Redis (Upstash ou local). |
| `backend/middleware/auth.js` | Middleware de autenticação que valida o token JWT. |
| `backend/routes/` | Diretório que contém todos os arquivos de rota da API (ex: `authRoutes.js`, `clansRoutes.js`). |
| `backend/services/` | Diretório que contém a lógica de negócio desacoplada das rotas. |
| `backend/utils/` | Diretório de utilitários puros e lógicas de jogo padronizadas (ex: `gameLogic.js`). |
| `backend/scripts/` | Diretório com scripts de validação, manutenção e debug (ex: `check-schema.js`). |
| `backend/migrations/` | Pasta com as migrações do banco de dados, gerenciadas por `node-pg-migrate`. |

### Frontend
| Arquivo | Responsabilidade |
|---------|------------------|
| `frontend/src/main.tsx` | Ponto de entrada da aplicação React, onde o App é renderizado no DOM. |
| `frontend/src/App.tsx` | Componente raiz que define a estrutura de roteamento e os provedores globais (SWR, etc.). |
| `frontend/src/pages/Home.tsx` | Exemplo de página principal ou dashboard do jogador. |
| `frontend/src/lib/axios.ts` | Instância configurada do Axios para realizar chamadas à API. |
| `frontend/src/services/` | Diretório com funções que encapsulam a lógica de chamada à API (ex: `playerService.ts`). |
| `frontend/tailwind.config.js` | Arquivo de configuração do Tailwind CSS para customização do tema. |
| `frontend/vite.config.ts` | Arquivo de configuração do Vite, incluindo plugins e aliases de caminho. |

### Raiz / Configuração
| Arquivo | Responsabilidade |
|---------|------------------|
| `package.json` (raiz) | Orquestra os workspaces `frontend` e `backend` com `concurrently` e define scripts globais. |
| `docker-compose.yml` | Define e orquestra os serviços de infraestrutura (PostgreSQL, Redis) com Docker. |
| `.env` (não versionado) | Arquivos para armazenar variáveis de ambiente sensíveis (chaves de API, senhas). |

> **Nota para a IA:** Ao planejar alterações, consulte primeiro os arquivos centrais relevantes para a tarefa. Eles contêm a estrutura e a lógica base que devem ser respeitadas.

---

## 🤖 Como o Gemini deve usar este arquivo

- **Sempre que for gerar ou modificar código**, consulte este ADR para entender a arquitetura e padrões.
- **Ao sugerir novas rotas ou serviços**, siga o padrão de serviços no backend e a estrutura de componentes no frontend.
- **Respeite as convenções de proxy, aliases de caminho e variáveis de ambiente** descritas acima.
- **Quando houver dúvida entre abordagens**, priorize as decisões arquiteturais registradas aqui.
- **Use a lista de arquivos centrais** para localizar rapidamente onde implementar mudanças.

---

## 🔗 Relação com outros contextos

- `PROJECT_CONTEXT.md` – Visão geral do projeto, stack e estrutura de pastas.
- `CODE_MODE.md` – Define o comportamento de execução de código (fallback, etc.).
- Este ADR complementa ambos, fornecendo as justificativas e padrões por trás da organização.