# 🧠 PROJECT CONTEXT — UrbanClash Team

> Este arquivo serve como contexto fixo para o Gemini Code Assist.  
> Sempre que você for gerar ou modificar código, **consulte este documento** para entender a estrutura, dependências e regras de negócio.

---

## 📌 Visão Geral do Projeto

O **UrbanClash Team** é uma aplicação web full-stack estruturada como um **monorepo**, composta por:

- **Frontend:** React + TypeScript  
- **Backend:** Node.js + Express  

A aplicação possui características de **jogo multiplayer com gamificação**, incluindo:

- Sistema de clãs  
- Perfis de jogador  
- Atributos (ataque, defesa, etc.)  
- Pontos de ação  
- Progressão por níveis  

O ambiente de desenvolvimento é orquestrado com `concurrently`, permitindo rodar frontend e backend simultaneamente, e o uso de **Docker** garante consistência entre ambientes.

---

## 🧰 Tech Stack

### Frontend
- React 18  
- TypeScript  
- Vite  
- Tailwind CSS  
- React Router DOM  
- Axios  
- Socket.IO Client  
- ESLint  

### Backend
- Node.js  
- Express.js  
- JavaScript (ESM)  
- PostgreSQL  
- pg (cliente nativo)  
- node-pg-migrate  
- JWT  
- Socket.IO  
- Redis (@upstash/redis)  
- express-validator  

### DevOps & Ferramentas
- npm  
- concurrently  
- Docker / docker-compose  
- dotenv  

---

## 📁 Estrutura do Projeto
urbanclashteam/
├── backend/
│ ├── config/
│ ├── middleware/
│ ├── migrations/
│ ├── routes/
│ ├── services/
│ ├── package.json
│ └── server.js
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── lib/
│ │ ├── pages/
│ │ └── services/
│ ├── package.json
│ └── vite.config.ts
├── config/
│ └── scripts/
├── docker-compose.yml
├── package.json
└── README.md

text

---

## 🎮 Lógica de Negócio

### Usuários
- Cadastro e login com JWT  
- Proteção de rotas  

### Perfil
- Nível, XP  
- Atributos  
- Dinheiro  
- Pontos de ação  

### Clãs
- Criação  
- Membros  
- Liderança  

### Tempo Real
- Socket.IO para eventos  
- Redis para dados voláteis  

---

## ⚙️ Setup do Projeto

```bash
# Instalar todas as dependências (root, frontend, backend)
npm run install:all

# Rodar frontend e backend em modo desenvolvimento (concurrently)
npm run dev

# Subir banco de dados (PostgreSQL) com Docker
docker-compose up -d

# Rodar migrations no backend
npm run migrate:up --prefix backend