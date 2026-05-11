/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // SÊNIOR: Otimização de Performance para Queries de Status e Ranking
  
  // 1. Otimiza busca de aliados (Setor de Recuperação e Isolamento)
  // Esta query era lenta (1300ms+) devido ao filtro composto e ORDER BY
  pgm.createIndex("user_profiles", ["faction", "status", "status_ends_at"], {
    name: "idx_user_profiles_recovery_status",
    ifNotExists: true
  });

  // 2. Otimiza o Ranking Global
  // Usado frequentemente pelo rankingCacheService
  pgm.createIndex("user_profiles", ["level", "total_xp"], {
    name: "idx_user_profiles_ranking_performance",
    ifNotExists: true
  });

  // 3. Remove índice redundante (faction agora é prefixo do idx_user_profiles_recovery_status)
  pgm.dropIndex("user_profiles", ["faction"], { name: "idx_user_profiles_faction", ifExists: true });
};

exports.down = (pgm) => {
  pgm.createIndex("user_profiles", ["faction"], { name: "idx_user_profiles_faction", ifNotExists: true });
  pgm.dropIndex("user_profiles", ["faction", "status", "status_ends_at"], { name: "idx_user_profiles_recovery_status", ifExists: true });
  pgm.dropIndex("user_profiles", ["level", "total_xp"], { name: "idx_user_profiles_ranking_performance", ifExists: true });
};
