# 🧠 PROJECT CONTEXT — UrbanClash Team

> Este arquivo serve como contexto fixo para o Gemini Code Assist.  
> Sempre que você for gerar ou modificar código, **consulte este documento** para entender a estrutura, dependências e regras de negócio.

---

## 📌 Visão Geral do Projeto

O **UrbanClash Team** é uma aplicação web full-stack, desenvolvida como um **monorepo** para facilitar a integração e o desenvolvimento contínuo. O projeto é dividido em duas partes principais:

- **Frontend:** Uma interface de usuário moderna e reativa construída com **React** e **TypeScript**.
- **Backend:** Uma API robusta e escalável, utilizando **Node.js** e **Express**.

A aplicação incorpora elementos de **gamificação e interação social**, como um sistema de clãs, perfis de jogadores com atributos (ataque, defesa), pontos de ação e progressão de nível, criando uma experiência de jogo multiplayer envolvente.

Para garantir um ambiente de desenvolvimento consistente e eficiente, o projeto utiliza `concurrently` para executar o frontend e o backend simultaneamente. Além disso, o **Docker** é empregado para orquestrar os serviços essenciais, como o banco de dados, garantindo que o ambiente de desenvolvimento seja o mais próximo possível do de produção.

---

## 🧰 Tech Stack

### Frontend
- **Framework:** React 18
- **Linguagem:** TypeScript
- **Build Tool:** Vite
- **Estilização:** Tailwind CSS
- **Roteamento:** React Router DOM
- **Requisições HTTP:** Axios
- **Comunicação em Tempo Real:** Server-Sent Events (SSE) e Socket.IO Client
- **Linting:** ESLint
- **Ícones:** Lucide React, React Icons

### Backend
- **Plataforma:** Node.js
- **Framework:** Express.js
- **Linguagem:** JavaScript (ESM)
- **Banco de Dados:** PostgreSQL
- **Cliente PostgreSQL:** pg
- **Migrations:** node-pg-migrate
- **Autenticação:** JSON Web Token (JWT)
- **Comunicação em Tempo Real:** Server-Sent Events (SSE) e Socket.IO
- **Cache:** Redis (com `@upstash/redis`)
- **Validação de Requisições:** express-validator
- **Segurança:** Helmet, CORS, express-rate-limit

### DevOps & Ferramentas
- **Gerenciador de Pacotes:** npm
- **Execução Concorrente:** concurrently
- **Contêineres:** Docker / docker-compose
- **Variáveis de Ambiente:** dotenv
- **Monitoramento:** nodemon
- **Testes (Backend):** Jest, Supertest

---

## 📁 Estrutura do Projeto
urbanclashteam/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── migrations/
│   ├── node_modules/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── services/
│   ├── node_modules/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── .ai/
├── .husky/
├── docker-compose.yml
├── package.json
└── .gitignore

---

## 🎮 Lógica de Negócio

### Usuários e Autenticação
- **Cadastro e Login:** Sistema seguro de autenticação baseado em JSON Web Token (JWT).
- **Proteção de Rotas:** Middleware para garantir que apenas usuários autenticados possam acessar rotas protegidas.

### Perfil do Jogador
- **Atributos:** Gerenciamento de atributos como nível, experiência (XP), dinheiro e pontos de ação.
- **Progressão:** Lógica para evolução do jogador com base em suas ações no jogo.

### Clãs e Interação Social
- **Criação e Gerenciamento:** Funcionalidades para criar clãs, convidar membros e definir liderança.
- **Interação:** Mecanismos para interação entre membros do mesmo clã.

### Funcionalidades em Tempo Real
- **Eventos Direcionais com SSE:** Utilização de Server-Sent Events (SSE) para stream leve e unidirecional de dados do servidor para o cliente (ex: atualizações contínuas de estado do jogador).
- **Eventos Bidirecionais com Socket.IO:** Utilização de WebSockets para comunicação instantânea e bidirecional de eventos gerais e notificações.
- **Gerenciamento de Estado Volátil com Redis:** Uso de Redis para armazenar dados de acesso rápido e estado temporário, como sessões de usuários online.

---

## ⚙️ Setup e Comandos

Para configurar e executar o ambiente de desenvolvimento, siga os passos abaixo.

1.  **Instalar todas as dependências** (root, frontend e backend):
    ```bash
    npm run install:all
    ```

2.  **Subir os serviços com Docker** (PostgreSQL e Redis):
    ```bash
    docker-compose up -d
    ```

3.  **Executar as migrations** do banco de dados no backend:
    ```bash
    npm run migrate:up --prefix backend
    ```

4.  **Rodar o projeto em modo de desenvolvimento** (frontend e backend simultaneamente):
    ```bash
    npm run dev
    ```