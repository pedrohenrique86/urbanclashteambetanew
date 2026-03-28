# 🧠 PROJECT CONTEXT — UrbanClash Team

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
│   ├── config/
│   ├── middleware/
│   ├── migrations/
│   ├── routes/
│   ├── services/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── vite.config.ts
├── config/
│   └── scripts/
├── docker-compose.yml
├── package.json
└── README.md

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

## ⚙️ Setup

npm run install:all  
npm run dev  
docker-compose up -d  
npm run migrate:up --prefix backend  

---

## ⚠️ Pontos de Atenção

- Evitar sobrecarga no banco  
- Garantir consistência Redis + PostgreSQL  
- Padronizar lógica no backend  

---

## 🎯 Objetivo

Servir como contexto principal para IA entender o projeto e continuar o desenvolvimento em qualquer ambiente sem perder consistência.
