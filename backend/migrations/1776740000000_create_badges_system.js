/* eslint-disable camelcase */

/**
 * MIGRATION C — Badges e Conquistas
 *
 * O que faz:
 * 1. Cria `badges` — catálogo de todas as conquistas disponíveis no jogo
 * 2. Cria `player_badges` — badges conquistadas por jogador, com suporte
 *    a badges sazonais (podem ser reganhadas a cada temporada) e permanentes
 *
 * Dependências: users (inicial), seasons (Migration A)
 * Tabelas criadas: badges, player_badges
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: badges — catálogo imutável pelo jogador
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("badges", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },
    description: {
      type: "text",
      notNull: false,
    },
    icon_url: {
      type: "text",
      notNull: false,
    },
    type: {
      type: "varchar(50)",
      notNull: true,
      comment: "login_streak | ranking | victories | faction | seasonal | special",
    },
    condition_value: {
      type: "integer",
      notNull: false,
      comment: "Valor de gatilho numérico. Ex: 7 = login 7 dias seguidos. Null = sem gatilho numérico.",
    },
    is_seasonal: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Se true, pode ser reganha a cada temporada (season_id diferente). Se false, é única por jogador.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE badges
    ADD CONSTRAINT chk_badges_type
      CHECK (type IN ('login_streak', 'ranking', 'victories', 'faction', 'seasonal', 'special'));
  `);

  pgm.createIndex("badges", "type",        { name: "idx_badges_type"        });
  pgm.createIndex("badges", "is_seasonal", { name: "idx_badges_is_seasonal" });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: player_badges — registro de conquistas por jogador
  //
  //    Lógica de UNIQUE:
  //    - Badge sazonal (is_seasonal=true): UNIQUE (user_id, badge_id, season_id)
  //      → pode ser ganha novamente em outra season
  //    - Badge permanente (is_seasonal=false): season_id = NULL
  //      → UNIQUE (user_id, badge_id) via partial index abaixo
  //    A constraint principal cobre o caso sazonal. O partial index cobre o permanente.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("player_badges", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    badge_id: {
      type: "uuid",
      notNull: true,
      references: '"badges"',
      onDelete: "CASCADE",
    },
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "SET NULL",
      comment: "Preenchido para badges sazonais. NULL para badges permanentes.",
    },
    earned_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // Constraint principal: unicidade de badge sazonal por temporada
  pgm.addConstraint("player_badges", "uq_player_badges_seasonal", {
    unique: ["user_id", "badge_id", "season_id"],
  });

  // Partial unique index: badge permanente (season_id IS NULL) é única por (user_id, badge_id)
  pgm.sql(`
    CREATE UNIQUE INDEX idx_player_badges_permanent
    ON player_badges (user_id, badge_id)
    WHERE season_id IS NULL;
  `);

  pgm.createIndex("player_badges", "user_id",   { name: "idx_player_badges_user_id"   });
  pgm.createIndex("player_badges", "badge_id",  { name: "idx_player_badges_badge_id"  });
  pgm.createIndex("player_badges", "season_id", { name: "idx_player_badges_season_id" });
  pgm.createIndex("player_badges", "earned_at", { name: "idx_player_badges_earned_at" });
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_player_badges_permanent;`);
  pgm.dropTable("player_badges", { cascade: true });
  pgm.dropTable("badges",        { cascade: true });
};
