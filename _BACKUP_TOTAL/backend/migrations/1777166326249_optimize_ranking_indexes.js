/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Índices para ordenação de ranking de usuários (ajuda initializeRankingZSet e fallbacks)
  pgm.createIndex('user_profiles', ['level', 'total_xp'], { name: 'idx_user_profiles_ranking_performance', method: 'btree' });

  // Índices para ordenação de ranking de clãs
  pgm.createIndex('clans', ['season_score', 'member_count'], { name: 'idx_clans_ranking_performance', method: 'btree' });
};

exports.down = (pgm) => {
  pgm.dropIndex('user_profiles', ['level', 'total_xp'], { name: 'idx_user_profiles_ranking_performance' });
  pgm.dropIndex('clans', ['season_score', 'member_count'], { name: 'idx_clans_ranking_performance' });
};
