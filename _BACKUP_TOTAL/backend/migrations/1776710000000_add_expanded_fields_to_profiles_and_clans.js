/* eslint-disable camelcase */

/**
 * MIGRATION J — Novos campos em user_profiles e clans
 *
 * O que faz:
 * 1. Adiciona campos de economia expandida em user_profiles:
 *    - premium_coins, login_streak, last_login_date, season_score, total_playtime_minutes
 * 2. Adiciona coluna faction_id (FK → factions) em user_profiles — NULLABLE intencionalmente
 *    para não quebrar registros existentes. Será populada e tornada NOT NULL na Migration K.
 * 3. Adiciona campos de progressão em clans:
 *    - season_score, territory_count
 * 4. Adiciona coluna faction_id (FK → factions) em clans — NULLABLE pelo mesmo motivo.
 *
 * Dependências: Migration A (tabela factions deve existir)
 * Tabelas alteradas: user_profiles, clans
 *
 * ⚠️  NENHUM CAMPO ANTIGO É REMOVIDO — backward compatibility garantida.
 *     Os campos faction (VARCHAR) existentes em user_profiles e clans são mantidos.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. EXPANSÃO DE user_profiles
  // ─────────────────────────────────────────────────────────────────────────

  // 1a. Moeda premium — separada da money comum para auditoria e regras distintas
  pgm.addColumn("user_profiles", {
    premium_coins: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Moeda premium (paga/conquistada). Separada de money para auditoria independente.",
    },
  });

  // 1b. Controle de login consecutivo — base para badges e recompensas diárias
  pgm.addColumn("user_profiles", {
    login_streak: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Dias consecutivos de login. Zerado se o jogador não logar em 24h+.",
    },
  });

  pgm.addColumn("user_profiles", {
    last_login_date: {
      type: "date",
      notNull: false,
      comment: "Data do último login (DATE, sem hora). Usado para calcular login_streak.",
    },
  });

  // 1c. Score da temporada ativa — zerado pelo backend ao iniciar nova season
  pgm.addColumn("user_profiles", {
    season_score: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Score do jogador na temporada atual. Não é cumulativo entre seasons.",
    },
  });

  // 1d. Tempo de jogo — métrica para badges especiais e ranking de engajamento
  pgm.addColumn("user_profiles", {
    total_playtime_minutes: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Total de minutos jogados (cumulativo, não reseta entre seasons).",
    },
  });

  // 1e. FK para factions — NULLABLE aqui; será NOT NULL após Migration K
  //     ON DELETE SET NULL: se uma facção for removida, o perfil não quebra.
  pgm.addColumn("user_profiles", {
    faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "FK para factions. Nullable durante transição. Migration K popula e aplica NOT NULL.",
    },
  });

  pgm.createIndex("user_profiles", "faction_id",  { name: "idx_user_profiles_faction_id"  });
  pgm.createIndex("user_profiles", "season_score", { name: "idx_user_profiles_season_score" });
  pgm.createIndex("user_profiles", "login_streak", { name: "idx_user_profiles_login_streak" });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. EXPANSÃO DE clans
  // ─────────────────────────────────────────────────────────────────────────

  // 2a. Score do clã na temporada ativa
  pgm.addColumn("clans", {
    season_score: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Score acumulado do clã na temporada atual. Zerado ao iniciar nova season.",
    },
  });

  // 2b. Contagem de territórios controlados — mantida pelo backend após battles
  pgm.addColumn("clans", {
    territory_count: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Número de territórios do mapa controlados pelo clã. Atualizado pelo backend.",
    },
  });

  // 2c. FK para factions — NULLABLE aqui; será NOT NULL após Migration K
  pgm.addColumn("clans", {
    faction_id: {
      type: "integer",
      notNull: false,
      references: '"factions"',
      onDelete: "SET NULL",
      comment: "FK para factions. Nullable durante transição. Migration K popula e aplica NOT NULL.",
    },
  });

  pgm.createIndex("clans", "faction_id",  { name: "idx_clans_faction_id"  });
  pgm.createIndex("clans", "season_score", { name: "idx_clans_season_score" });
};

exports.down = (pgm) => {
  // clans — remover campos adicionados
  pgm.sql(`DROP INDEX IF EXISTS idx_clans_faction_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_clans_season_score;`);
  pgm.dropColumn("clans", "faction_id");
  pgm.dropColumn("clans", "territory_count");
  pgm.dropColumn("clans", "season_score");

  // user_profiles — remover campos adicionados
  pgm.sql(`DROP INDEX IF EXISTS idx_user_profiles_faction_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_user_profiles_season_score;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_user_profiles_login_streak;`);
  pgm.dropColumn("user_profiles", "faction_id");
  pgm.dropColumn("user_profiles", "total_playtime_minutes");
  pgm.dropColumn("user_profiles", "season_score");
  pgm.dropColumn("user_profiles", "last_login_date");
  pgm.dropColumn("user_profiles", "login_streak");
  pgm.dropColumn("user_profiles", "premium_coins");
};
