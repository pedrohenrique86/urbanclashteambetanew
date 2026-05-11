/* eslint-disable camelcase */

/**
 * MIGRATION E — Sorteios Pagos
 *
 * O que faz:
 * 1. Cria `raffles` — definição de sorteios pagos com prize_pool como snapshot JSONB
 * 2. Cria `raffle_tickets` — compras de tickets por jogador
 * 3. Cria `raffle_rewards` — auditoria EXPLÍCITA de prêmios obtidos
 *    Separa compra (raffle_tickets) de resultado (raffle_rewards) para auditoria completa.
 *
 * Dependências: users, items (B)
 * Tabelas criadas: raffles, raffle_tickets, raffle_rewards
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: raffles — definição de sorteios
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("raffles", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: {
      type: "varchar(100)",
      notNull: true,
    },
    description: {
      type: "text",
      notNull: false,
    },
    ticket_cost: {
      type: "integer",
      notNull: true,
      comment: "Custo em premium_coins por ticket.",
    },
    prize_pool: {
      type: "jsonb",
      notNull: false,
      comment: "Snapshot dos prêmios possíveis com probabilidades — para display na UI. Resultado real em raffle_rewards.",
    },
    max_tickets_per_user: {
      type: "integer",
      notNull: false,
      comment: "Null = sem limite por usuário.",
    },
    total_tickets_sold: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    starts_at: {
      type: "timestamptz",
      notNull: true,
    },
    ends_at: {
      type: "timestamptz",
      notNull: true,
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE raffles
    ADD CONSTRAINT chk_raffles_ticket_cost_positive
      CHECK (ticket_cost > 0);

    ALTER TABLE raffles
    ADD CONSTRAINT chk_raffles_dates
      CHECK (ends_at > starts_at);

    ALTER TABLE raffles
    ADD CONSTRAINT chk_raffles_max_tickets
      CHECK (max_tickets_per_user IS NULL OR max_tickets_per_user > 0);
  `);

  pgm.createIndex("raffles", "is_active",  { name: "idx_raffles_is_active"  });
  pgm.createIndex("raffles", "starts_at",  { name: "idx_raffles_starts_at"  });
  pgm.createIndex("raffles", "ends_at",    { name: "idx_raffles_ends_at"    });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: raffle_tickets — compras de tickets
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("raffle_tickets", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    raffle_id: {
      type: "uuid",
      notNull: true,
      references: '"raffles"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    quantity: {
      type: "integer",
      notNull: true,
      default: 1,
    },
    purchased_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE raffle_tickets
    ADD CONSTRAINT chk_raffle_tickets_quantity_positive
      CHECK (quantity > 0);
  `);

  pgm.createIndex("raffle_tickets", "raffle_id",    { name: "idx_raffle_tickets_raffle_id"    });
  pgm.createIndex("raffle_tickets", "user_id",      { name: "idx_raffle_tickets_user_id"      });
  pgm.createIndex("raffle_tickets", "purchased_at", { name: "idx_raffle_tickets_purchased_at" });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TABELA: raffle_rewards — auditoria explícita de prêmios
  //    Uma linha por prêmio sorteado. O backend preenche após o sorteio.
  //    `delivered` garante idempotência na entrega.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("raffle_rewards", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    raffle_id: {
      type: "uuid",
      notNull: true,
      references: '"raffles"',
      onDelete: "CASCADE",
    },
    ticket_id: {
      type: "uuid",
      notNull: true,
      references: '"raffle_tickets"',
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
      comment: "item | money | premium_coins",
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
      comment: "Valor monetário se não-item.",
    },
    rarity: {
      type: "varchar(20)",
      notNull: false,
    },
    drawn_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    delivered: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Confirmação atômica de entrega. Impede entrega duplicada.",
    },
    delivered_at: {
      type: "timestamptz",
      notNull: false,
    },
  });

  pgm.sql(`
    ALTER TABLE raffle_rewards
    ADD CONSTRAINT chk_raffle_reward_type
      CHECK (reward_type IN ('item', 'money', 'premium_coins'));

    ALTER TABLE raffle_rewards
    ADD CONSTRAINT chk_raffle_reward_rarity
      CHECK (rarity IN ('common', 'rare', 'legendary') OR rarity IS NULL);

    -- Um ticket resulta em no máximo 1 prêmio
    ALTER TABLE raffle_rewards
    ADD CONSTRAINT uq_raffle_rewards_one_per_ticket
      UNIQUE (ticket_id);
  `);

  pgm.createIndex("raffle_rewards", "raffle_id",  { name: "idx_raffle_rewards_raffle_id"  });
  pgm.createIndex("raffle_rewards", "user_id",    { name: "idx_raffle_rewards_user_id"    });
  pgm.createIndex("raffle_rewards", "delivered",  { name: "idx_raffle_rewards_delivered"  });
  pgm.createIndex("raffle_rewards", "drawn_at",   { name: "idx_raffle_rewards_drawn_at"   });
};

exports.down = (pgm) => {
  pgm.dropTable("raffle_rewards", { cascade: true });
  pgm.dropTable("raffle_tickets", { cascade: true });
  pgm.dropTable("raffles",        { cascade: true });
};
