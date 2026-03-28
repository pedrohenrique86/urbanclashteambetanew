\# Registro de Decisões de Arquitetura (ADR) - UrbanClash Team



Este documento registra as decisões técnicas, padrões e convenções estabelecidas para o projeto. O objetivo é manter a consistência, a qualidade e facilitar a integração de novos desenvolvedores.



\## 1. Decisões Arquiteturais



\- \*\*Estrutura de Monorepo:\*\* O projeto é organizado em um monorepo com workspaces distintos para `frontend` e `backend`. A orquestração é feita via `npm` na raiz, utilizando `concurrently` para gerenciar os processos.

\- \*\*Stack Tecnológica:\*\*

&nbsp;   - \*\*Frontend:\*\* React com TypeScript, utilizando Vite como bundler. Esta escolha favorece a performance no desenvolvimento (`HMR`) e a robustez do TypeScript.

&nbsp;   - \*\*Backend:\*\* Node.js com Express.js. Uma escolha minimalista e performática para a construção de APIs REST.

\- \*\*Banco de Dados:\*\* PostgreSQL é o banco de dados relacional principal. A interação não utiliza um ORM completo (como Prisma ou Sequelize), mas sim o driver `pg` diretamente, o que oferece controle máximo sobre as queries SQL.

\- \*\*Migrações de Schema:\*\* As migrações do banco de dados são gerenciadas pela biblioteca `node-pg-migrate`, garantindo um versionamento explícito e controlado do schema.

\- \*\*Comunicação em Tempo Real:\*\* WebSockets são implementados com a biblioteca `socket.io` para funcionalidades que exigem comunicação bidirecional e instantânea entre cliente e servidor.

\- \*\*Cache e Serviços Auxiliares:\*\* Redis é utilizado como um armazenamento de dados em memória, indicado pela dependência `@upstash/redis` e pelo script de inicialização que aguarda o serviço na porta `6379`.

\- \*\*Containerização:\*\* Docker e `docker-compose` são utilizados para padronizar e orquestrar o ambiente de desenvolvimento, incluindo o banco de dados e outros serviços como o Redis.



\## 2. Padrões de Código



\- \*\*Backend - Arquitetura de Serviços:\*\* A lógica de negócio é encapsulada em "serviços" (ex: `actionPointsService`, `gameStateService`), separando as responsabilidades das camadas de rota e de acesso a dados.

\- \*\*Backend - Padrão de Middleware:\*\* O Express utiliza middlewares de forma extensiva para tarefas transversais, como autenticação (`middleware/auth.js`), logging (`morgan`) e segurança (`helmet`).

\- \*\*Frontend - Arquitetura de Componentes:\*\* A UI é construída com base em componentes React, seguindo uma estrutura clara em `src/components`.

\- \*\*Frontend - Gerenciamento de Estado:\*\* O estado local é gerenciado por hooks do React (`useState`, `useEffect`). Para dados de servidor, `swr` ("stale-while-revalidate") é o padrão para fetching, cache e revalidação.

\- \*\*Frontend - Estilização:\*\* A estilização é feita primariamente com Tailwind CSS. Configurações de tema (cores, fontes) estão centralizadas em `tailwind.config.cjs`.

\- \*\*Frontend - Path Aliasing:\*\* Para evitar imports relativos complexos (`../../../`), foram configurados aliases de caminho no `tsconfig.json` (ex: `components/\*`, `services/\*`).



\## 3. Convenções Importantes



\- \*\*Gerenciador de Pacotes:\*\* `npm` é o gerenciador de pacotes padrão. A instalação de todas as dependências do monorepo deve ser feita com `npm run install:all` a partir da raiz.

\- \*\*Variáveis de Ambiente:\*\* A configuração de ambiente é gerenciada por arquivos `.env`, carregados pelo pacote `dotenv`. Arquivos `.env` são estritamente locais e não devem ser versionados (`.gitignore`).

\- \*\*Proxy de API:\*\* No ambiente de desenvolvimento, todas as chamadas do frontend para `/api` são redirecionadas para o servidor backend (`http://localhost:3001`) através do proxy configurado no `vite.config.ts`.

\- \*\*Qualidade de Código:\*\*

&nbsp;   - \*\*Linting:\*\* ESLint é mandatório e configurado para JavaScript e TypeScript.

&nbsp;   - \*\*Formatação:\*\* A formatação é automatizada ao salvar, conforme definido em `.vscode/settings.json`.

\- \*\*Scripts de Validação:\*\* Os comandos `predev` e `prebuild` nos `package.json` garantem que as validações de lint e tipo sejam executadas antes de iniciar o servidor de desenvolvimento ou de gerar um build, funcionando como um quality gate.



\## 4. Regras Implícitas do Projeto



\- \*\*Prioridade à Segurança:\*\* O arquivo `config/rules.master.md` define "Segurança" como a prioridade máxima. Isso se reflete no uso de `helmet`, `express-rate-limit`, validação de entrada com `express-validator` e autenticação robusta com JWT.

\- \*\*TypeScript Estrito:\*\* O frontend opera com a flag `"strict": true` no `tsconfig.json`. Código que não adere às regras estritas de tipo não será compilado.

\- \*\*Imutabilidade e Previsibilidade:\*\* O uso de `swr` e React Hooks no frontend favorece padrões de imutabilidade e um fluxo de dados unidirecional.

\- \*\*Testes:\*\* Embora a cobertura de testes não tenha sido totalmente analisada, a presença de `jest` e `supertest` no backend indica a intenção de que a lógica de negócio e os endpoints da API sejam testados.

