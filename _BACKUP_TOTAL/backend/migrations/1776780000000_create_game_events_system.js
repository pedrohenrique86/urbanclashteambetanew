/* eslint-disable camelcase */

/**
 * MIGRATION G — Sistema de Eventos Aleatórios
 *
 * O que faz:
 * 1. Cria `game_events` — templates de eventos (catálogo imutável em uso)
 * 2. Cria `active_events` — instâncias de eventos ativos com duração e facção alvo
 * 3. Adiciona a FK `price_history.active_event_id → active_events.id`
 *    (não foi possível adicionar na Migration F pois active_events não existia ainda)
 *
 * Dependências: seasons (A), factions (A), shop_items/price_history (F)
 * Tabelas criadas: game_events, active_events
 * Tabelas alteradas: price_history (adiciona FK retroativa)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: game_events — templates de eventos
  //    `effect_config` JSONB define QUAIS campos alterar e POR QUANTO.
  //    A lógica de aplicação dos efeitos é 100% do backend.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("game_events", {
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
    type: {
      type: "varchar(50)",
      notNull: true,
      comment: "economy | combat | faction | map | bonus",
    },
    effect_config: {
      type: "jsonb",
      notNull: false,
      comment: "Configuração dos efeitos: quais campos alterar e multiplicadores. Ex: {\"price_modifier\": 0.5}",
    },
    duration_hours: {
      type: "integer",
      notNull: false,
      comment: "Duração padrão do evento em horas após ativação.",
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
      comment: "Se este template pode ser instanciado. false = aposentado.",
    },
  });

  pgm.sql(`
    ALTER TABLE game_events
    ADD CONSTRAINT chk_game_events_type
      CHECK (type IN ('economy', 'combat', 'faction', 'map', 'bonus'));

    ALTER TABLE game_events
    ADD CONSTRAINT chk_game_events_duration
      CHECK (duration_hours IS NULL OR duration_hours > 0);
  `);

  pgm.createIndex("game_events", "type",      { name: "idx_game_events_type"      });
  pgm.createIndex("game_events", "is_active", { name: "idx_game_events_is_active" });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TABELA: active_events — instâncias de eventos em andamento ou encerrados
  //    Separa template (game_events) de instância (active_events),
  //    permitindo histórico completo de eventos ocorridos.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("active_events", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    event_id: {
      type: "uuid",
      notNull: true,
      references: '"game_events"',
      onDelete: "CASCADE",
    },
    season_id: {
      type: "integer",
      notNull: false,
      references: '"seasons"',
      onDelete: "SET NULL",
    },
    started_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
    ends_at: {
      type: "timestamptz",
      notNull: true,
    },
    faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "null = afeta todas as facções. Preenchido para eventos específicos de facção.",
    },
    triggered_by: {
      type: "varchar(30)",
      notNull: false,
      comment: "system | admin | random",
    },
    is_resolved: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "true = evento encerrado e efeitos revertidos pelo backend.",
    },
  });

  pgm.sql(`
    ALTER TABLE active_events
    ADD CONSTRAINT chk_active_events_dates
      CHECK (ends_at > started_at);

    ALTER TABLE active_events
    ADD CONSTRAINT chk_active_events_triggered_by
      CHECK (triggered_by IN ('system', 'admin', 'random') OR triggered_by IS NULL);
  `);

  pgm.createIndex("active_events", "event_id",    { name: "idx_active_events_event_id"    });
  pgm.createIndex("active_events", "season_id",   { name: "idx_active_events_season_id"   });
  pgm.createIndex("active_events", "faction_id",  { name: "idx_active_events_faction_id"  });
  pgm.createIndex("active_events", "is_resolved", { name: "idx_active_events_is_resolved" });
  pgm.createIndex("active_events", "ends_at",     { name: "idx_active_events_ends_at"     });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. FK RETROATIVA: price_history.active_event_id → active_events.id
  //    Agora que active_events existe, podemos fechar este relacionamento.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.sql(`
    ALTER TABLE price_history
    ADD CONSTRAINT fk_price_history_active_event
      FOREIGN KEY (active_event_id)
      REFERENCES active_events (id)
      ON DELETE SET NULL;

    CREATE INDEX idx_price_history_active_event_id
    ON price_history (active_event_id)
    WHERE active_event_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  // Remove FK retroativa de price_history antes de dropar active_events
  pgm.sql(`
    DROP INDEX IF EXISTS idx_price_history_active_event_id;

    ALTER TABLE price_history
    DROP CONSTRAINT IF EXISTS fk_price_history_active_event;
  `);

  pgm.dropTable("active_events", { cascade: true });
  pgm.dropTable("game_events",   { cascade: true });
};
