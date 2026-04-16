# 🚀 MIGRATIONS - UrbanClash

Sistema de migrations usando `node-pg-migrate` com suporte a:

- Ambiente de desenvolvimento (DEV)
- Ambiente de produção (PROD)

---

# 📌 CONFIGURAÇÃO

No arquivo `.env`:

```env
DATABASE_URL_DEV=postgresql://USER:PASS@HOST-DEV/DB?sslmode=require
DATABASE_URL_PROD=postgresql://USER:PASS@HOST-PROD/DB?sslmode=require

🧪 COMANDOS
Subir migrations em DEV
npm run migrate:up:dev --prefix backend
Subir migrations em PROD
npm run migrate:up:prod --prefix backend
Descer última migration DEV
npm run migrate:down:dev --prefix backend
Descer última migration PROD
npm run migrate:down:prod --prefix backend
🔁 EXECUTAR EM AMBOS (CUIDADO)
npm run migrate:up:all --prefix backend

⚠️ NÃO recomendado sem testar antes.

🛠️ CRIAR NOVA MIGRATION
npm run migrate:create --prefix backend nome_da_migration

Exemplo:

npm run migrate:create --prefix backend add_new_column
🧠 COMO FUNCIONA
O sistema usa a tabela pgmigrations
Cada migration roda apenas UMA vez
Se já rodou → é ignorada
⚠️ ERROS COMUNS
❌ "relation already exists"

Causa:

tabela criada manualmente
migration tentando recriar

Solução:

usar banco limpo
OU
alinhar migrations com schema atual