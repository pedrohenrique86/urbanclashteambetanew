exports.shorthands = undefined;

exports.up = (pgm) => {
  // Tabela de Usuários (users)
  pgm.createTable(
    "users",
    {
      id: "id",
      username: { type: "varchar(50)", notNull: true, unique: true },
      email: { type: "varchar(100)", notNull: true, unique: true },
      password_hash: { type: "varchar(255)", notNull: true },
      email_confirmed: { type: "boolean", default: false, notNull: true },
      confirmation_token: { type: "varchar(255)" },
      reset_password_token: { type: "varchar(255)" },
      reset_password_expires: { type: "timestamp" },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
      last_login: { type: "timestamp" },
    },
    { ifNotExists: true },
  );

  // Tabela de Perfis de Usuário (user_profiles)
  pgm.createTable(
    "user_profiles",
    {
      id: "id",
      user_id: {
        type: "integer",
        notNull: true,
        references: '"users"(id)',
        onDelete: "CASCADE",
        unique: true,
      },
      faction: { type: "varchar(50)" }, // 'Gangster', 'Guard'
      level: { type: "integer", default: 1, notNull: true },
      experience: { type: "integer", default: 0, notNull: true },
      money: { type: "decimal(15, 2)", default: 1000.0, notNull: true },
      energy: { type: "integer", default: 100, notNull: true },
      max_energy: { type: "integer", default: 100, notNull: true },
      health: { type: "integer", default: 100, notNull: true },
      max_health: { type: "integer", default: 100, notNull: true },
      last_updated: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    { ifNotExists: true },
  );

  // Tabela de Clãs (clans)
  pgm.createTable(
    "clans",
    {
      id: "id",
      name: { type: "varchar(100)", notNull: true, unique: true },
      tag: { type: "varchar(5)", notNull: true, unique: true },
      description: { type: "text" },
      owner_id: {
        type: "integer",
        notNull: true,
        references: '"users"(id)',
        onDelete: "SET NULL", // Se o dono for deletado, o clã não é deletado
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    { ifNotExists: true },
  );

  // Tabela de Membros do Clã (clan_members)
  pgm.createTable(
    "clan_members",
    {
      id: "id",
      user_id: {
        type: "integer",
        notNull: true,
        references: '"users"(id)',
        onDelete: "CASCADE",
      },
      clan_id: {
        type: "integer",
        notNull: true,
        references: '"clans"(id)',
        onDelete: "CASCADE",
      },
      role: { type: "varchar(50)", default: "'member'", notNull: true }, // 'owner', 'officer', 'member'
      joined_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    { ifNotExists: true },
  );

  // Adiciona um índice para acelerar buscas
  pgm.createIndex("user_profiles", "user_id", { ifNotExists: true });
  pgm.createIndex("clan_members", ["user_id", "clan_id"], {
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  // A ordem de remoção é a inversa da criação para respeitar as chaves estrangeiras
  pgm.dropTable("clan_members", { ifExists: true });
  pgm.dropTable("clans", { ifExists: true });
  pgm.dropTable("user_profiles", { ifExists: true });
  pgm.dropTable("users", { ifExists: true });
};
