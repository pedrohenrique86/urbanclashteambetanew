🧠 Fluxo recomendado
# 1. Atualizar estrutura

npm run migrate:up:all --prefix backend

# 2. Popular dados

npm run seed:all --prefix backend

🧱 Migration altera o banco
🌱 Seed popula o banco


FINALIZAR TODOS OS PROCESSOS DO TERMINAL (ÚTIL DEMAIS PARA LIMPAR ERROS E CACHE)
taskkill /F /IM node.exe
tasklist /FI "IMAGENAME eq node.exe"


🧱 Migrations
📌 Comandos principais
▶️ Subir migrations
npm run migrate:up:dev --prefix backend
npm run migrate:up:prod --prefix backend
⬇️ Descer migrations
npm run migrate:down:dev --prefix backend
npm run migrate:down:prod --prefix backend
🔁 Executar em ambos ambientes
npm run migrate:up:all --prefix backend

🎲 Criar migration com nome aleatório
npm run migrate:create:random --prefix backend


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



