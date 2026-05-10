/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // SÊNIOR: Otimização de Índices Críticos
  
  // 1. Inventário: Carregamento ultra-rápido de itens EQUIPADOS (usado em combates e snapshots)
  pgm.createIndex("player_inventory", ["user_id", "is_equipped"], {
    name: "idx_inventory_user_equipped",
    ifNotExists: true
  });

  // 2. Perfis: Otimiza filtros por facção (usado no ranking e feed)
  pgm.createIndex("user_profiles", ["faction"], {
    name: "idx_user_profiles_faction",
    ifNotExists: true
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("player_inventory", ["user_id", "is_equipped"], { name: "idx_inventory_user_equipped", ifExists: true });
  pgm.dropIndex("user_profiles", ["faction"], { name: "idx_user_profiles_faction", ifExists: true });
};
