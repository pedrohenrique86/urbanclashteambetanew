/* eslint-disable camelcase */

/**
 * MIGRATION D — Sistema de Cartas Diárias
 *
 * O que faz:
 * 1. Cria `daily_card_pools` — pool de recompensas configurável por temporada
 * 2. Cria `player_daily_cards` — registro do sorteio diário (3 opções) por jogador
 * 3. Cria `card_rewards` — auditoria EXPLÍCITA e atômica de cada recompensa entregue
 *    (não depende apenas do JSONB em player_daily_cards para validação de entrega)
 *
 * Dependências: users, items (B), seasons (A)
 * Tabelas criadas: daily_card_pools, player_daily_cards, card_rewards
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: daily_card_pools — pool configurável por temporada
  //    O backend usa esta tabela para montar as 3 opções diárias com base
  //    nos pesos (weight). Lógica de sorteio 100% no backend.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("daily_card_pools", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "CASCADE",
      comment: "NULL = pool global (vale para qualquer temporada).",
    },
    item_id: {
      type: "uuid",
      notNull: false,
      references: '"items"',
      onDelete: "CASCADE",
      comment: "Preenchido apenas se reward_type = 'item'.",
    },
    reward_type: {
      type: "varchar(30)",
      notNull: true,
      comment: "item | money | premium_coins | xp | action_points",
    },
    reward_value: {
      type: "integer",
      notNull: false,
      comment: "Valor da recompensa para tipos não-item (ex: 500 money, 50 xp).",
    },
    weight: {
      type: "integer",
      notNull: true,
      default: 100,
      comment: "Peso relativo de probabilidade. Maior = mais comum. Lógica de sorteio no backend.",
    },
    rarity: {
      type: "varchar(20)",
      notNull: true,
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },
  });

  pgm.sql(`
    ALTER TABLE daily_card_pools
    ADD CONSTRAINT chk_card_pool_reward_type
      CHECK (reward_type IN ('item', 'money', 'premium_coins', 'xp', 'action_points'));

    ALTER TABLE daily_card_pools
    ADD CONSTRAINT chk_card_pool_rarity
      CHECK (rarity IN ('common', 'rare', 'legendary'));

    ALTER TABLE daily_card_pools
    ADD CONSTRAINT chk_card_pool_weight_positive
      CHECK (weight > 0);

    -- Se reward_type = 'item', item_id deve estar preenchido
    ALTER TABLE daily_card_pools
    ADD CONSTRAINT chk_card_pool_item_consistency
      CHECK (
        (reward_type = 'item' AND item_id IS NOT NULL)
        OR
        (reward_type != 'item' AND reward_value IS NOT NULL)
      );
  `);

  pgm.createIndex("daily_card_pools", "season_id",  { name: "idx_card_pool_season_id"  });
  pgm.createIndex("daily_card_pools", "reward_type",{ name: "idx_card_pool_reward_type"});
  pgm.createIndex("daily_card_pools", "is_active",  { name: "idx_card_pool_is_active"  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: player_daily_cards — 1 registro por jogador por dia
  //    O JSONB nas opções serve como snapshot de display rápido.
  //    A entrega real é rastreada em card_rewards (tabela 3).
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("player_daily_cards", {
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
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "SET NULL",
    },
    presented_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
      comment: "Após esta data, a opção expira e o jogador perde o sorteio do dia.",
    },
    card_option_1: {
      type: "jsonb",
      notNull: false,
      comment: "Snapshot da opção 1 para display rápido na UI.",
    },
    card_option_2: {
      type: "jsonb",
      notNull: false,
      comment: "Snapshot da opção 2.",
    },
    card_option_3: {
      type: "jsonb",
      notNull: false,
      comment: "Snapshot da opção 3.",
    },
    chosen_option: {
      type: "smallint",
      notNull: false,
      comment: "Qual opção o jogador escolheu: 1, 2 ou 3.",
    },
    chosen_at: {
      type: "timestamptz",
      notNull: false,
    },
  });

  pgm.sql(`
    ALTER TABLE player_daily_cards
    ADD CONSTRAINT chk_daily_card_chosen_option
      CHECK (chosen_option IN (1, 2, 3) OR chosen_option IS NULL);

    ALTER TABLE player_daily_cards
    ADD CONSTRAINT chk_daily_card_expires
      CHECK (expires_at > presented_at);
  `);

  // UNIQUE por dia: garante que o jogador só recebe 1 sorteio por dia
  pgm.sql(`
    CREATE UNIQUE INDEX idx_player_daily_cards_one_per_day
    ON player_daily_cards (user_id, DATE(presented_at AT TIME ZONE 'UTC'));
  `);

  pgm.createIndex("player_daily_cards", "user_id",      { name: "idx_daily_cards_user_id"      });
  pgm.createIndex("player_daily_cards", "season_id",    { name: "idx_daily_cards_season_id"    });
  pgm.createIndex("player_daily_cards", "presented_at", { name: "idx_daily_cards_presented_at" });
  pgm.createIndex("player_daily_cards", "expires_at",   { name: "idx_daily_cards_expires_at"   });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TABELA: card_rewards — auditoria explícita e atômica de recompensas
  //    Uma linha por recompensa entregue. `delivered` garante idempotência.
  //    `source_ref_id` em player_inventory aponta para o id desta tabela.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("card_rewards", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    daily_card_id: {
      type: "uuid",
      notNull: true,
      references: '"player_daily_cards"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    reward_type: {
      type: "varchar(30)",
      notNull: true,
    },
    item_id: {
      type: "uuid",
      notNull: false,
      references: '"items"',
      onDelete: "SET NULL",
      comment: "Preenchido se reward_type = 'item'.",
    },
    reward_value: {
      type: "integer",
      notNull: false,
      comment: "Valor da recompensa não-item (money, xp, etc.).",
    },
    rarity: {
      type: "varchar(20)",
      notNull: true,
    },
    delivered: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "false = recompensa gerada mas não entregue. true = entregue ao jogador. Garante idempotência.",
    },
    delivered_at: {
      type: "timestamptz",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE card_rewards
    ADD CONSTRAINT chk_card_reward_type
      CHECK (reward_type IN ('item', 'money', 'premium_coins', 'xp', 'action_points'));

    ALTER TABLE card_rewards
    ADD CONSTRAINT chk_card_reward_rarity
      CHECK (rarity IN ('common', 'rare', 'legendary'));

    -- 1 carta = 1 recompensa
    ALTER TABLE card_rewards
    ADD CONSTRAINT uq_card_rewards_one_per_card
      UNIQUE (daily_card_id);
  `);

  pgm.createIndex("card_rewards", "user_id",      { name: "idx_card_rewards_user_id"      });
  pgm.createIndex("card_rewards", "delivered",    { name: "idx_card_rewards_delivered"    });
  pgm.createIndex("card_rewards", "created_at",   { name: "idx_card_rewards_created_at"   });
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_player_daily_cards_one_per_day;`);
  pgm.dropTable("card_rewards",      { cascade: true });
  pgm.dropTable("player_daily_cards",{ cascade: true });
  pgm.dropTable("daily_card_pools",  { cascade: true });
};
