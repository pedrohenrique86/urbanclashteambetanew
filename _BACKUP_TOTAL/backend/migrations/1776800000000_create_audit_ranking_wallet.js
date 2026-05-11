/* eslint-disable camelcase */

/**
 * MIGRATION I — Auditoria, Ranking e Ledger Financeiro
 *
 * O que faz:
 * 1. Cria `wallet_transactions` — ledger financeiro completo de money e premium_coins
 *    com balance_before/after para reconstrução de histórico sem agregações.
 * 2. Cria `season_rankings` — snapshot de ranking ao fechar cada temporada
 * 3. Cria `action_logs` — log de auditoria geral de ações críticas do sistema
 *
 * Dependências: users, factions (A), seasons (A)
 * Tabelas criadas: wallet_transactions, season_rankings, action_logs
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: wallet_transactions — ledger financeiro (double-entry style)
  //    BIGSERIAL para performance em tabela de altíssimo volume.
  //    Cada operação de money ou premium_coins gera UMA linha aqui.
  //    `balance_before` e `balance_after` permitem auditoria sem somar histórico.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("wallet_transactions", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    currency_type: {
      type: "varchar(20)",
      notNull: true,
      comment: "money | premium_coins",
    },
    amount: {
      type: "integer",
      notNull: true,
      comment: "Positivo = entrada (crédito). Negativo = saída (débito).",
    },
    balance_before: {
      type: "integer",
      notNull: true,
      comment: "Saldo antes desta operação. Permite auditoria sem regredir o histórico.",
    },
    balance_after: {
      type: "integer",
      notNull: true,
      comment: "Saldo após esta operação. Deve ser balance_before + amount.",
    },
    operation_type: {
      type: "varchar(50)",
      notNull: true,
      comment: "card_reward | shop_purchase | raffle_buy | raffle_prize | territory_bonus | event_bonus | admin_grant | season_reward",
    },
    ref_entity_type: {
      type: "varchar(50)",
      notNull: false,
      comment: "Tipo da entidade de origem: card_reward | raffle_reward | shop_item | active_event...",
    },
    ref_entity_id: {
      type: "text",
      notNull: false,
      comment: "UUID da entidade de origem como texto (flexível para qualquer tabela).",
    },
    description: {
      type: "varchar(255)",
      notNull: false,
      comment: "Descrição legível para exibição no extrato do jogador.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_currency_type
      CHECK (currency_type IN ('money', 'premium_coins'));

    ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_operation_type
      CHECK (operation_type IN (
        'card_reward', 'shop_purchase', 'raffle_buy', 'raffle_prize',
        'territory_bonus', 'event_bonus', 'admin_grant', 'season_reward'
      ));

    -- Validação de consistência: balance_after = balance_before + amount
    ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_balance_consistency
      CHECK (balance_after = balance_before + amount);

    -- Saldo nunca pode ser negativo após a operação
    ALTER TABLE wallet_transactions
    ADD CONSTRAINT chk_wallet_balance_non_negative
      CHECK (balance_after >= 0);
  `);

  pgm.createIndex("wallet_transactions", "user_id",        { name: "idx_wallet_user_id"        });
  pgm.createIndex("wallet_transactions", "currency_type",  { name: "idx_wallet_currency_type"  });
  pgm.createIndex("wallet_transactions", "operation_type", { name: "idx_wallet_operation_type" });
  pgm.createIndex("wallet_transactions", "created_at",     { name: "idx_wallet_created_at"     });

  // Índice composto para extrato filtrado por usuário + moeda + data
  pgm.sql(`
    CREATE INDEX idx_wallet_user_currency_date
    ON wallet_transactions (user_id, currency_type, created_at DESC);
  `);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: season_rankings — snapshot imutável ao fechar temporada
  //    Calculado e inserido pelo backend quando is_active passa de true → false.
  //    Uma linha por jogador por temporada (UNIQUE enforced).
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("season_rankings", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    season_id: {
      type: "integer",
      notNull: true,
      references: '"seasons"',
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
    final_score: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    rank_position: {
      type: "integer",
      notNull: false,
      comment: "Posição no ranking geral da temporada. Calculado ao fechar a season.",
    },
    victories: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    defeats: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    territories_contributed: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Número de batalhas de território em que o jogador contribuiu.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // 1 linha por jogador por temporada — garante idempotência do snapshot
  pgm.addConstraint("season_rankings", "uq_season_rankings_season_user", {
    unique: ["season_id", "user_id"],
  });

  pgm.sql(`
    ALTER TABLE season_rankings
    ADD CONSTRAINT chk_rankings_final_score_positive
      CHECK (final_score >= 0);
  `);

  pgm.createIndex("season_rankings", "season_id",    { name: "idx_rankings_season_id"    });
  pgm.createIndex("season_rankings", "user_id",      { name: "idx_rankings_user_id"      });
  pgm.createIndex("season_rankings", "faction_id",   { name: "idx_rankings_faction_id"   });
  pgm.createIndex("season_rankings", "final_score",  { name: "idx_rankings_final_score"  });
  pgm.createIndex("season_rankings", "rank_position",{ name: "idx_rankings_rank_position"});

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TABELA: action_logs — auditoria geral de ações críticas
  //    BIGSERIAL para volume. JSONB em metadata para flexibilidade.
  //    Não é uma tabela de negócio — é para auditoria e suporte.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("action_logs", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },
    user_id: {
      type: "uuid",
      notNull: false,
      references: '"users"',
      onDelete: "SET NULL",
      comment: "null = ação do sistema sem usuário específico.",
    },
    action_type: {
      type: "varchar(80)",
      notNull: true,
      comment: "Ex: purchase, card_chosen, battle_join, territory_attack, raffle_buy, login, admin_action",
    },
    entity_type: {
      type: "varchar(50)",
      notNull: false,
      comment: "Tipo da entidade afetada: item, territory, raffle, season...",
    },
    entity_id: {
      type: "text",
      notNull: false,
      comment: "UUID da entidade afetada como texto.",
    },
    metadata: {
      type: "jsonb",
      notNull: false,
      comment: "Dados contextuais adicionais da ação. Não substitui as tabelas de auditoria específicas.",
    },
    ip_address: {
      type: "inet",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.createIndex("action_logs", "user_id",     { name: "idx_action_logs_user_id"     });
  pgm.createIndex("action_logs", "action_type", { name: "idx_action_logs_action_type" });
  pgm.createIndex("action_logs", "entity_type", { name: "idx_action_logs_entity_type" });
  pgm.createIndex("action_logs", "created_at",  { name: "idx_action_logs_created_at"  });

  // Índice composto para auditoria por usuário no tempo
  pgm.sql(`
    CREATE INDEX idx_action_logs_user_created
    ON action_logs (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_wallet_user_currency_date;
    DROP INDEX IF EXISTS idx_action_logs_user_created;
  `);
  pgm.dropTable("action_logs",         { cascade: true });
  pgm.dropTable("season_rankings",     { cascade: true });
  pgm.dropTable("wallet_transactions", { cascade: true });
};
