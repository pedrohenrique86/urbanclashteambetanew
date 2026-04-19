/* eslint-disable camelcase */

/**
 * MIGRATION B — Itens e Inventário
 *
 * O que faz:
 * 1. Cria `items` — catálogo global de todos os itens do jogo (fonte de verdade)
 * 2. Cria `player_inventory` — instâncias de itens por jogador, com rastreabilidade
 *    de origem via `source_ref_id` (liga ao card_reward, raffle_reward, etc.)
 *
 * Dependências: users (schema inicial)
 * Tabelas criadas: items, player_inventory
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: items — catálogo global, imutável pelo jogador
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("items", {
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
    type: {
      type: "varchar(30)",
      notNull: true,
      comment: "weapon | equipment | shield | consumable",
    },
    rarity: {
      type: "varchar(20)",
      notNull: true,
      comment: "common | rare | legendary",
    },
    icon_url: {
      type: "text",
      notNull: false,
    },
    base_attack_bonus: {
      type: "numeric",
      notNull: true,
      default: 0,
    },
    base_defense_bonus: {
      type: "numeric",
      notNull: true,
      default: 0,
    },
    base_focus_bonus: {
      type: "numeric",
      notNull: true,
      default: 0,
    },
    base_energy_bonus: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    base_price: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Preço base de referência. Preço real da loja fica em shop_items.",
    },
    is_tradeable: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    is_lootable: {
      type: "boolean",
      notNull: true,
      default: true,
      comment: "Se pode aparecer em cartas diárias ou sorteios.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // Constraints de validação de valores
  pgm.sql(`
    ALTER TABLE items
    ADD CONSTRAINT chk_items_type
      CHECK (type IN ('weapon', 'equipment', 'shield', 'consumable'));

    ALTER TABLE items
    ADD CONSTRAINT chk_items_rarity
      CHECK (rarity IN ('common', 'rare', 'legendary'));

    ALTER TABLE items
    ADD CONSTRAINT chk_items_price_positive
      CHECK (base_price >= 0);
  `);

  pgm.createIndex("items", "type",   { name: "idx_items_type"   });
  pgm.createIndex("items", "rarity", { name: "idx_items_rarity" });
  pgm.createIndex("items", "is_lootable", { name: "idx_items_is_lootable" });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: player_inventory — instâncias de itens por jogador
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("player_inventory", {
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
    item_id: {
      type: "uuid",
      notNull: true,
      references: '"items"',
      onDelete: "CASCADE",
    },
    quantity: {
      type: "integer",
      notNull: true,
      default: 1,
    },
    is_equipped: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    slot: {
      type: "varchar(30)",
      notNull: false,
      comment: "weapon | shield | helmet | armor | accessory",
    },
    durability: {
      type: "integer",
      notNull: false,
      comment: "Null = sem desgaste. Valor numérico = durabilidade restante.",
    },
    acquired_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    acquired_via: {
      type: "varchar(50)",
      notNull: false,
      comment: "card | shop | raffle | event | admin",
    },
    source_ref_id: {
      type: "uuid",
      notNull: false,
      comment: "UUID do registro de origem (card_reward.id, raffle_reward.id, etc.). Elo de auditoria.",
    },
  });

  pgm.sql(`
    ALTER TABLE player_inventory
    ADD CONSTRAINT chk_inventory_quantity_positive
      CHECK (quantity > 0);

    ALTER TABLE player_inventory
    ADD CONSTRAINT chk_inventory_acquired_via
      CHECK (acquired_via IN ('card', 'shop', 'raffle', 'event', 'admin') OR acquired_via IS NULL);
  `);

  pgm.createIndex("player_inventory", "user_id",      { name: "idx_inventory_user_id"      });
  pgm.createIndex("player_inventory", "item_id",      { name: "idx_inventory_item_id"      });
  pgm.createIndex("player_inventory", "is_equipped",  { name: "idx_inventory_is_equipped"  });
  pgm.createIndex("player_inventory", "acquired_via", { name: "idx_inventory_acquired_via" });
};

exports.down = (pgm) => {
  pgm.dropTable("player_inventory", { cascade: true });
  pgm.dropTable("items",            { cascade: true });
};
