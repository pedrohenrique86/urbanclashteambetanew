/* eslint-disable camelcase */

/**
 * MIGRATION F — Loja e Histórico de Preços
 *
 * O que faz:
 * 1. Cria `shop_items` — itens disponíveis na loja com preços dinâmicos por temporada
 * 2. Cria `price_history` — log de cada alteração de preço (economia dinâmica auditável)
 *    OBS: A coluna `active_event_id` é criada sem FK aqui, pois `active_events` ainda
 *    não existe. A FK será adicionada na Migration G como ALTER TABLE ADD CONSTRAINT.
 *
 * Dependências: items (B), seasons (A)
 * Tabelas criadas: shop_items, price_history
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: shop_items — preços por item por temporada e moeda
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("shop_items", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    item_id: {
      type: "uuid",
      notNull: true,
      references: '"items"',
      onDelete: "CASCADE",
    },
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "CASCADE",
      comment: "NULL = disponível em todas as temporadas.",
    },
    current_price: {
      type: "integer",
      notNull: true,
      comment: "Preço atual em vigor (base_price * price_modifier, arredondado pelo backend).",
    },
    base_price: {
      type: "integer",
      notNull: true,
      comment: "Preço base sem modificadores.",
    },
    price_modifier: {
      type: "numeric(6,4)",
      notNull: true,
      default: 1.0,
      comment: "Multiplicador dinâmico. Alterado pelo backend quando eventos econômicos ocorrem.",
    },
    currency_type: {
      type: "varchar(20)",
      notNull: true,
      comment: "money | premium_coins",
    },
    stock: {
      type: "integer",
      notNull: false,
      comment: "Null = estoque infinito. Decrementado pelo backend a cada compra.",
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE shop_items
    ADD CONSTRAINT chk_shop_items_currency_type
      CHECK (currency_type IN ('money', 'premium_coins'));

    ALTER TABLE shop_items
    ADD CONSTRAINT chk_shop_items_price_positive
      CHECK (current_price >= 0 AND base_price >= 0);

    ALTER TABLE shop_items
    ADD CONSTRAINT chk_shop_items_modifier_positive
      CHECK (price_modifier > 0);

    ALTER TABLE shop_items
    ADD CONSTRAINT chk_shop_items_stock
      CHECK (stock IS NULL OR stock >= 0);

    -- Um item só pode aparecer uma vez por combinação (item, season, moeda)
    ALTER TABLE shop_items
    ADD CONSTRAINT uq_shop_items_item_season_currency
      UNIQUE (item_id, season_id, currency_type);
  `);

  pgm.createIndex("shop_items", "item_id",     { name: "idx_shop_items_item_id"     });
  pgm.createIndex("shop_items", "season_id",   { name: "idx_shop_items_season_id"   });
  pgm.createIndex("shop_items", "is_active",   { name: "idx_shop_items_is_active"   });
  pgm.createIndex("shop_items", "currency_type",{ name: "idx_shop_items_currency"   });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: price_history — log auditável de variações de preço
  //    BIGSERIAL para performance em tabela de alto volume de escrita.
  //    `active_event_id` sem FK aqui — FK adicionada na Migration G após
  //    criação da tabela active_events.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("price_history", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },
    shop_item_id: {
      type: "uuid",
      notNull: true,
      references: '"shop_items"',
      onDelete: "CASCADE",
    },
    item_id: {
      type: "uuid",
      notNull: true,
      references: '"items"',
      onDelete: "CASCADE",
    },
    old_price: {
      type: "integer",
      notNull: true,
    },
    new_price: {
      type: "integer",
      notNull: true,
    },
    old_modifier: {
      type: "numeric(6,4)",
      notNull: true,
    },
    new_modifier: {
      type: "numeric(6,4)",
      notNull: true,
    },
    change_reason: {
      type: "varchar(80)",
      notNull: false,
      comment: "event | admin | season_start | market_pressure",
    },
    active_event_id: {
      type: "uuid",
      notNull: false,
      comment: "UUID do active_event causador. FK adicionada após Migration G criar active_events.",
    },
    changed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.sql(`
    ALTER TABLE price_history
    ADD CONSTRAINT chk_price_history_reason
      CHECK (change_reason IN ('event', 'admin', 'season_start', 'market_pressure') OR change_reason IS NULL);
  `);

  pgm.createIndex("price_history", "shop_item_id", { name: "idx_price_history_shop_item_id" });
  pgm.createIndex("price_history", "item_id",      { name: "idx_price_history_item_id"      });
  pgm.createIndex("price_history", "changed_at",   { name: "idx_price_history_changed_at"   });
};

exports.down = (pgm) => {
  pgm.dropTable("price_history", { cascade: true });
  pgm.dropTable("shop_items",    { cascade: true });
};
