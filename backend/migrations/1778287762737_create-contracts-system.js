/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // 1. Adicionar heat aos territórios
  pgm.addColumn("map_territories", {
    heat: { type: "integer", notNull: true, default: 0 },
  });

  // 2. Adicionar mérito e corrupção aos perfis
  pgm.addColumn("user_profiles", {
    merit: { type: "integer", notNull: true, default: 0 },
    corruption: { type: "integer", notNull: true, default: 0 },
  });

  // 3. Tabela de Contratos Ativos
  pgm.createTable("active_contracts", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    user_id: { type: "uuid", notNull: true, references: '"users"', onDelete: "CASCADE" },
    territory_id: { type: "uuid", notNull: true, references: '"map_territories"', onDelete: "CASCADE" },
    type: { type: "varchar(20)", notNull: true }, // 'preparacao', 'execucao'
    status: { type: "varchar(20)", notNull: true, default: "pending" }, // 'pending', 'active', 'completed', 'intercepted'
    prep_vigiar_seguranca: { type: "boolean", notNull: true, default: false },
    prep_hackear_cameras: { type: "boolean", notNull: true, default: false },
    prep_preparar_rota: { type: "boolean", notNull: true, default: false },
    execution_ends_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
  });

  pgm.createIndex("active_contracts", "user_id");
  pgm.createIndex("active_contracts", "status");
  pgm.createIndex("active_contracts", "territory_id");

  // 4. Tabela de Logs de Contratos (Live Feed)
  pgm.createTable("contract_logs", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    user_id: { type: "uuid", references: '"users"', onDelete: "SET NULL" },
    username: { type: "varchar(50)" },
    faction: { type: "varchar(20)" },
    event_type: { type: "varchar(50)" }, // 'heist_started', 'heist_success', 'heist_failed', 'intercept_success'
    message: { type: "text", notNull: true },
    territory_name: { type: "varchar(100)" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
  });

  pgm.createIndex("contract_logs", "created_at");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable("contract_logs");
  pgm.dropTable("active_contracts");
  pgm.dropColumns("user_profiles", ["merit", "corruption"]);
  pgm.dropColumns("map_territories", ["heat"]);
};
