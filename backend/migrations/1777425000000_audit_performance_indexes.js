/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // SÊNIOR: Índice parcial para otimizar o fechamento de logs de status.
  // Como a maioria dos logs já estão encerrados (ended_at is NOT NULL),
  // um índice parcial economiza espaço e torna a busca por 'logs em aberto' instantânea.
  pgm.createIndex("player_status_logs", ["user_id"], {
    name: "idx_status_logs_user_active",
    where: "ended_at IS NULL"
  });

  // Otimização para busca de membros de clãs (usada no ranking)
  pgm.createIndex("clan_members", ["user_id"], {
    name: "idx_clan_members_user_id"
  });

  // Otimização para busca de clãs por facção no ranking
  pgm.createIndex("clans", ["faction"], {
    name: "idx_clans_faction"
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("player_status_logs", ["user_id"], { name: "idx_status_logs_user_active" });
  pgm.dropIndex("clan_members", ["user_id"], { name: "idx_clan_members_user_id" });
  pgm.dropIndex("clans", ["faction"], { name: "idx_clans_faction" });
};
