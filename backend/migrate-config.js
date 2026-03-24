// Carrega as variáveis de ambiente do arquivo .env
require("dotenv").config();

// Validação para garantir que a DATABASE_URL está presente
if (!process.env.DATABASE_URL) {
  throw new Error("A variável de ambiente DATABASE_URL não está definida.");
}

module.exports = {
  // Usa a string de conexão completa do .env
  connectionString: process.env.DATABASE_URL,

  // Diretório onde os arquivos de migração serão armazenados
  dir: "migrations",

  // Tabela que o node-pg-migrate usará para rastrear quais migrações já foram executadas
  migrationsTable: "pgmigrations",

  // Garante que cada migração seja executada dentro de uma transação.
  decamelize: true,
  direction: "up",
  verbose: true,
  transaction: "all",
};
