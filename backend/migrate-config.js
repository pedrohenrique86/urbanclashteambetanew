// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Validação básica para garantir que as variáveis essenciais estão presentes
if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("Uma ou mais variáveis de ambiente do banco de dados (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) não estão definidas.");
}

module.exports = {
  // Configurações do banco de dados lidas do .env
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Diretório onde os arquivos de migração serão armazenados
  dir: 'migrations',

  // Tabela que o node-pg-migrate usará para rastrear quais migrações já foram executadas
  migrationsTable: 'pgmigrations',

  // Garante que cada migração seja executada dentro de uma transação.
  // Se a migração falhar, todas as alterações são revertidas.
  decamelize: true,
  direction: 'up',
  verbose: true,
  // Ativa o modo de transação para todas as migrações
  checkOrder: false,
  // Desativa a verificação de ordem para evitar problemas com branches
  // mas exige mais disciplina da equipe.
  // Para a maioria dos projetos, é seguro manter como false.
  // Se você tiver várias pessoas criando migrações simultaneamente,
  // pode ser útil definir como true.
  // Para o seu caso, false é o ideal.
  // A opção 'all' garante que a migração inteira seja uma transação.
  // A opção 'each' cria uma transação para cada instrução SQL.
  // 'all' é mais seguro.
  transaction: 'all',
};