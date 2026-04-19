/* eslint-disable camelcase */

/**
 * MIGRATION A — Fundação: Facções e Temporadas
 *
 * O que faz:
 * 1. Cria a tabela `factions` — entidade canônica das facções do jogo
 * 2. Semeia as duas facções: 'renegados' e 'guardioes'
 * 3. Cria a tabela `seasons` — controla os ciclos de temporada (20 dias cada)
 * 4. Garante que apenas UMA temporada pode estar ativa por vez (partial unique index)
 *
 * Dependências: nenhuma (é a base de tudo)
 * Tabelas criadas: factions, seasons
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. TABELA: factions
  //    Substituirá o VARCHAR livre usado em user_profiles.faction e clans.faction.
  //    SERIAL garante IDs pequenos e estáveis (1, 2) para as duas facções.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("factions", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    name: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
      comment: "Identificador interno: renegados | guardioes",
    },
    display_name: {
      type: "varchar(100)",
      notNull: true,
      comment: "Nome exibido na UI: Renegados | Guardiões",
    },
    color_hex: {
      type: "varchar(7)",
      notNull: false,
      comment: "Cor primária da facção no frontend (#RRGGBB)",
    },
    description: {
      type: "text",
      notNull: false,
    },
    total_score: {
      type: "bigint",
      notNull: true,
      default: 0,
      comment: "Score acumulado da facção na temporada ativa. Resetado pelo backend ao abrir nova season.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // Índice explícito para busca por name (mais comum que por ID no backend)
  pgm.createIndex("factions", "name", { name: "idx_factions_name" });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SEED: facções canônicas
  //    'renegados' mapeia os antigos 'gangsters'
  //    'guardioes' mapeia os antigos 'guardas'
  //    Os IDs serão 1 e 2 respectivamente (garantido pela ordem do INSERT).
  // ─────────────────────────────────────────────────────────────────────────
  pgm.sql(`
    INSERT INTO factions (name, display_name, color_hex, description)
    VALUES
      (
        'renegados',
        'Renegados',
        '#E8333A',
        'Facção do caos. Atacam territórios, desestabilizam a economia e dominam pela força.'
      ),
      (
        'guardioes',
        'Guardiões',
        '#3A7FE8',
        'Facção da ordem. Defendem territórios, protegem aliados e garantem estabilidade.'
      )
    ON CONFLICT (name) DO NOTHING;
  `);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TABELA: seasons
  //    Controla ciclos de temporada (duração configurável, padrão 20 dias).
  //    Cada temporada tem início, fim, vencedor (facção) e flag de ativa.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.createTable("seasons", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    number: {
      type: "integer",
      notNull: true,
      unique: true,
      comment: "Número sequencial da temporada: 1, 2, 3...",
    },
    name: {
      type: "varchar(100)",
      notNull: false,
      comment: "Nome temático: 'Temporada 1 — Caos Total'",
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
      default: false,
      comment: "Apenas UMA temporada pode estar ativa. Garantido pelo partial unique index abaixo.",
    },
    winning_faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "Preenchido pelo backend ao fechar a temporada.",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PARTIAL UNIQUE INDEX — garante só 1 season ativa por vez
  //    Tentativas de inserir/atualizar uma segunda season com is_active=true
  //    serão rejeitadas automaticamente pelo PostgreSQL.
  // ─────────────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE UNIQUE INDEX idx_seasons_only_one_active
    ON seasons (is_active)
    WHERE is_active = true;
  `);

  pgm.createIndex("seasons", "is_active", { name: "idx_seasons_is_active" });
  pgm.createIndex("seasons", "starts_at", { name: "idx_seasons_starts_at" });
  pgm.createIndex("seasons", "ends_at",   { name: "idx_seasons_ends_at"   });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. CHECK CONSTRAINT — ends_at deve ser depois de starts_at
  // ─────────────────────────────────────────────────────────────────────────
  pgm.sql(`
    ALTER TABLE seasons
    ADD CONSTRAINT chk_seasons_dates CHECK (ends_at > starts_at);
  `);
};

exports.down = (pgm) => {
  // Ordem inversa: seasons depende de factions
  pgm.sql(`DROP INDEX IF EXISTS idx_seasons_only_one_active;`);
  pgm.dropTable("seasons",  { cascade: true });
  pgm.dropTable("factions", { cascade: true });
};
