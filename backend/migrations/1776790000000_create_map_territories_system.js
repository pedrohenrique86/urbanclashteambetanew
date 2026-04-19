/* eslint-disable camelcase */

/**
 * MIGRATION H — Mapa e Territórios
 *
 * O que faz:
 * 1. Cria `map_territories` — territórios do mapa com bônus, posição e proteção
 *    O campo `protected_until` é o controle de imunidade pós-conquista.
 * 2. Cria `territory_battles` — disputas por território entre facções
 * 3. Cria `territory_contributions` — contribuição individual de cada jogador por batalha
 *    Base para ranking individual de território e recompensas pós-batalha.
 *
 * Dependências: factions (A), seasons (A), users
 * Tabelas criadas: map_territories, territory_battles, territory_contributions
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: map_territories
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("map_territories", {
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
    region: {
      type: "varchar(50)",
      notNull: false,
      comment: "Agrupamento geográfico do mapa (ex: 'Norte', 'Centro Industrial').",
    },
    controlling_faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "Facção que controla o território. NULL = neutro.",
    },
    contested: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "true = há uma territory_battle ativa para este território.",
    },
    income_bonus: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Bônus de money por ciclo para todos os jogadores da facção controladora.",
    },
    defense_bonus: {
      type: "numeric(5,2)",
      notNull: true,
      default: 0,
      comment: "Bônus percentual de defesa para jogadores da facção controladora.",
    },
    map_x: {
      type: "numeric(8,4)",
      notNull: false,
      comment: "Posição X do território no mapa da UI.",
    },
    map_y: {
      type: "numeric(8,4)",
      notNull: false,
      comment: "Posição Y do território no mapa da UI.",
    },
    protected_until: {
      type: "timestamptz",
      notNull: false,
      comment: "Imunidade pós-conquista. Se not null e > now(), o backend bloqueia novos ataques. Nenhuma lógica no banco.",
    },
    last_conquered_at: {
      type: "timestamptz",
      notNull: false,
      comment: "Timestamp da última conquista. Usado para calcular protected_until no backend.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE map_territories
    ADD CONSTRAINT chk_territory_income_positive
      CHECK (income_bonus >= 0);

    ALTER TABLE map_territories
    ADD CONSTRAINT chk_territory_defense_positive
      CHECK (defense_bonus >= 0);
  `);

  pgm.createIndex("map_territories", "controlling_faction_id", { name: "idx_territories_faction_id"       });
  pgm.createIndex("map_territories", "contested",              { name: "idx_territories_contested"        });
  pgm.createIndex("map_territories", "region",                 { name: "idx_territories_region"           });
  pgm.createIndex("map_territories", "protected_until",        { name: "idx_territories_protected_until"  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: territory_battles — disputas por território
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("territory_battles", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    territory_id: {
      type: "uuid",
      notNull: true,
      references: '"map_territories"',
      onDelete: "CASCADE",
    },
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "SET NULL",
    },
    attacking_faction_id: {
      type: "integer",
      notNull: true,
      references: '"factions"',
      onDelete: "CASCADE",
    },
    defending_faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "NULL se o território era neutro quando o ataque começou.",
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    ends_at: {
      type: "timestamptz",
      notNull: true,
      comment: "Horário de encerramento da batalha. Backend resolve ao atingir este timestamp.",
    },
    attacker_score: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    defender_score: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    winner_faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "Preenchido pelo backend ao resolver a batalha.",
    },
    is_resolved: {
      type: "boolean",
      notNull: true,
      default: false,
    },
  });

  pgm.sql(`
    ALTER TABLE territory_battles
    ADD CONSTRAINT chk_battle_dates
      CHECK (ends_at > started_at);

    ALTER TABLE territory_battles
    ADD CONSTRAINT chk_battle_scores_positive
      CHECK (attacker_score >= 0 AND defender_score >= 0);

    -- Um território não pode ter duas batalhas ativas ao mesmo tempo
    CREATE UNIQUE INDEX idx_territory_battles_active_per_territory
    ON territory_battles (territory_id)
    WHERE is_resolved = false;
  `);

  pgm.createIndex("territory_battles", "territory_id",          { name: "idx_battles_territory_id"      });
  pgm.createIndex("territory_battles", "season_id",             { name: "idx_battles_season_id"         });
  pgm.createIndex("territory_battles", "attacking_faction_id",  { name: "idx_battles_attacking_faction" });
  pgm.createIndex("territory_battles", "defending_faction_id",  { name: "idx_battles_defending_faction" });
  pgm.createIndex("territory_battles", "is_resolved",           { name: "idx_battles_is_resolved"       });
  pgm.createIndex("territory_battles", "ends_at",               { name: "idx_battles_ends_at"           });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TABELA: territory_contributions — contribuição individual
  //    Base para ranking de território, leaderboard e recompensas pós-batalha.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("territory_contributions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    battle_id: {
      type: "uuid",
      notNull: true,
      references: '"territory_battles"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    faction_id: {
      type: "integer",
      notNull: true,
      references: '"factions"',
      onDelete: "CASCADE",
    },
    score_contributed: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    action_points_spent: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    contributed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE territory_contributions
    ADD CONSTRAINT chk_contribution_score_positive
      CHECK (score_contributed >= 0);

    ALTER TABLE territory_contributions
    ADD CONSTRAINT chk_contribution_ap_positive
      CHECK (action_points_spent >= 0);
  `);

  // Índice composto para ranking de contribuições por batalha
  pgm.createIndex("territory_contributions", ["battle_id", "score_contributed"], {
    name: "idx_contributions_battle_score",
  });
  pgm.createIndex("territory_contributions", "user_id",    { name: "idx_contributions_user_id"    });
  pgm.createIndex("territory_contributions", "faction_id", { name: "idx_contributions_faction_id" });
  pgm.createIndex("territory_contributions", "contributed_at", { name: "idx_contributions_contributed_at" });
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_territory_battles_active_per_territory;`);
  pgm.dropTable("territory_contributions", { cascade: true });
  pgm.dropTable("territory_battles",       { cascade: true });
  pgm.dropTable("map_territories",         { cascade: true });
};
