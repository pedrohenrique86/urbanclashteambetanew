🚀 UrbanClash — Migrations & Seeds

Sistema de gerenciamento de banco de dados utilizando:

Migrations → Estrutura do banco
Seeds → Dados iniciais e conteúdo do jogo

Suporte completo para:

🧪 Ambiente de Desenvolvimento (DEV)
🌐 Ambiente de Produção (PROD)
⚙️ Configuração

Defina as variáveis no arquivo .env:

DATABASE_URL_DEV=postgresql://USER:PASS@HOST-DEV/DB?sslmode=require
DATABASE_URL_PROD=postgresql://USER:PASS@HOST-PROD/DB?sslmode=require

FINALIZAR TODOS OS PROCESSOS DO TERMINAL (ÚTIL DEMAIS PARA LIMPAR ERROS E CACHE)
tasklist /FI "IMAGENAME eq node.exe"



🧱 Migrations

Gerenciadas via node-pg-migrate

📌 Comandos principais
▶️ Subir migrations
npm run migrate:up:dev --prefix backend
npm run migrate:up:prod --prefix backend
⬇️ Descer migrations
npm run migrate:down:dev --prefix backend
npm run migrate:down:prod --prefix backend
🔁 Executar em ambos ambientes
npm run migrate:up:all --prefix backend

⚠️ Use com cuidado — sempre teste em DEV antes

🛠️ Criar nova migration
npm run migrate:create --prefix backend nome_da_migration
Exemplo:
npm run migrate:create --prefix backend add_new_column
🎲 Criar migration com nome aleatório
npm run migrate:create:random --prefix backend

✔ Ideal para evitar conflitos de nome

🧠 Como funciona
Utiliza a tabela interna pgmigrations
Cada migration roda apenas uma vez
Se já executada → é ignorada automaticamente
⚠️ Erros comuns
❌ relation already exists

Causa:

Migration duplicada
Ou tentativa de criar algo já existente

Solução:

Verificar migrations anteriores
Usar IF NOT EXISTS quando aplicável

🌱 Seeds

Responsáveis por popular o banco com:

Itens
Loja (shop_items)
Badges
Eventos
Cartas diárias
📌 Comandos
▶️ Rodar seed em DEV
npm run seed:dev --prefix backend
▶️ Rodar seed em PROD
npm run seed:prod --prefix backend
🔁 Rodar em ambos
npm run seed:all --prefix backend
🧠 Como funciona
Seed é idempotente
Pode rodar múltiplas vezes sem duplicar dados
Usa:
SELECT antes de inserir
ON CONFLICT
validações de existência
⚠️ Boas práticas
Sempre rodar primeiro em DEV
Validar logs antes de rodar em PROD
Nunca usar seed para alterar estrutura (isso é migration)
📌 Regra de Ouro

🧱 Migration altera o banco
🌱 Seed popula o banco

🧠 Fluxo recomendado
# 1. Atualizar estrutura
npm run migrate:up:all --prefix backend

# 2. Popular dados
npm run seed:all --prefix backend
🏁 Resultado

Com esse setup você tem:

✔ Controle total de ambientes
✔ Execução segura e previsível
✔ Estrutura limpa e escalável
✔ Padrão profissional de backend