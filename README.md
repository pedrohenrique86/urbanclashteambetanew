# UrbanClash Team 🏙️⚔️

Um sistema completo de gerenciamento de clãs urbanos com autenticação, perfis de usuário e funcionalidades avançadas.

## 🚀 Configuração do Ambiente Local

### Pré-requisitos

- **Docker Desktop** instalado e rodando
- **Node.js** (versão 16 ou superior)
- **Git**
- Conta **SendGrid** (opcional, para emails)

### 📦 Instalação Rápida

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd urbanclashteam
   ```

2. **Instale as dependências do frontend e backend:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Configure o ambiente:**
   ```bash
   npm run setup
   ```
   Este comando irá:
   - Solicitar sua chave API do SendGrid
   - Configurar URLs e segurança
   - Criar arquivos `.env` necessários

4. **Inicie o ambiente de desenvolvimento local:**
   ```bash
   start-dev-local.bat
   ```
   Este script inicia tanto o backend quanto o frontend em modo de desenvolvimento.

### 🌐 Acessos

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **PostgreSQL:** localhost:5432
  - Usuário: `urbanclash_user`
  - Senha: `urbanclash_password`
  - Database: `urbanclash`

## 🛠️ Scripts Disponíveis

### Desenvolvimento Local

```bash
# Configurar ambiente inicial
npm run setup

# Iniciar todos os serviços
npm run dev:start

# Parar todos os serviços
npm run dev:stop

# Ver logs dos containers
npm run dev:logs

# Resetar banco de dados (apaga todos os dados)
npm run dev:reset

# Instalar dependências do backend
npm run backend:install
```

### Frontend

```bash
# Iniciar servidor de desenvolvimento
npm start

# Build para produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint
```

### Backup e Restauração do Banco de Dados

```bash
# Exportar dados do banco local
npm run export:local

# Verificar conexão com o banco
npm run check:db
```

Os scripts de migração para o Supabase foram removidos, pois o projeto agora utiliza apenas o banco de dados PostgreSQL local.

## 🏗️ Arquitetura

### Backend (Node.js + Express)

- **Autenticação JWT** com sessões no banco
- **Validação de emails** via SendGrid
- **Rate limiting** e segurança
- **API RESTful** completa
- **Middleware de autenticação**

### Frontend (React + TypeScript + Vite)

- **Interface moderna** e responsiva
- **Gerenciamento de estado** com Context API
- **Roteamento** com React Router
- **Componentes reutilizáveis**

### Banco de Dados (PostgreSQL)

- **Tabelas principais:**
  - `users` - Usuários do sistema
  - `user_profiles` - Perfis detalhados
  - `clans` - Clãs/grupos
  - `clan_members` - Membros dos clãs
  - `user_sessions` - Sessões ativas

## 📧 Configuração do SendGrid

1. Crie uma conta em [SendGrid](https://sendgrid.com/)
2. Gere uma API Key
3. Execute `npm run setup` e forneça a chave
4. Configure um domínio verificado (opcional)

### Emails Enviados

- **Confirmação de cadastro**
- **Recuperação de senha**
- **Boas-vindas**

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
urbanclashteam/
├── backend/                 # API Node.js
│   ├── config/             # Configurações
│   ├── middleware/         # Middlewares
│   ├── routes/             # Rotas da API
│   ├── services/           # Serviços (email, etc)
│   └── server.js           # Servidor principal
├── database/               # Scripts SQL
├── src/                    # Frontend React
├── docker-compose.yml      # Orquestração Docker
├── Dockerfile.backend      # Build do backend
└── start-dev.bat          # Script de inicialização
```

### Adicionando Novas Funcionalidades

1. **Backend:** Adicione rotas em `backend/routes/`
2. **Frontend:** Atualize `src/lib/supabaseClient.ts`
3. **Banco:** Modifique `database/init.sql`

### Debugging

```bash
# Ver logs em tempo real
npm run dev:logs

# Acessar container do backend
docker exec -it urbanclash-backend bash

# Acessar PostgreSQL
docker exec -it urbanclash-postgres psql -U urbanclash_user -d urbanclash
```

## 🚀 Deploy

### Produção

1. Configure variáveis de ambiente de produção
2. Use um banco PostgreSQL gerenciado
3. Configure HTTPS
4. Use um serviço de email confiável

### Variáveis de Ambiente Importantes

```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=seu-jwt-secret-seguro
SENDGRID_API_KEY=sua-chave-sendgrid
FROM_EMAIL=noreply@seudominio.com
FRONTEND_URL=https://seudominio.com

# Frontend
VITE_API_URL=https://api.seudominio.com/api
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se o Docker está rodando
2. Execute `npm run dev:reset` para resetar o ambiente
3. Verifique os logs com `npm run dev:logs`
4. Abra uma issue no repositório

---

**Desenvolvido com ❤️ para a comunidade UrbanClash**