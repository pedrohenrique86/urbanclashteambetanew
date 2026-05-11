/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Cria o tipo ENUM oficial
  pgm.createType("player_status_type", [
    "Operacional", 
    "Sangrando", 
    "Recondicionamento", 
    "Isolamento", 
    "Aprimoramento"
  ]);

  // 2. Padronização de dados legados
  pgm.sql("UPDATE user_profiles SET status = 'Operacional' WHERE status IN ('livre', 'active', 'ok', '') OR status IS NULL");
  pgm.sql("UPDATE user_profiles SET status = 'Isolamento' WHERE status = 'preso'");
  pgm.sql("UPDATE user_profiles SET status = 'Recondicionamento' WHERE status = 'recuperacao'");

  // 3. Conversão segura para o user_profiles
  // Importante: Remover o default antigo primeiro para evitar erro de cast
  pgm.alterColumn("user_profiles", "status", { default: null });
  pgm.alterColumn("user_profiles", "status", {
    type: "player_status_type",
    using: "status::player_status_type",
  });
  pgm.alterColumn("user_profiles", "status", {
    default: "Operacional",
    notNull: true
  });

  // 4. Conversão segura para o player_status_logs
  pgm.sql("UPDATE player_status_logs SET status = 'Operacional' WHERE status IN ('livre', 'active', 'ok', '') OR status IS NULL");
  pgm.sql("UPDATE player_status_logs SET status = 'Isolamento' WHERE status = 'preso'");
  pgm.sql("UPDATE player_status_logs SET status = 'Recondicionamento' WHERE status = 'recuperacao'");

  pgm.alterColumn("player_status_logs", "status", {
    type: "player_status_type",
    using: "status::player_status_type",
    notNull: true
  });
};

exports.down = (pgm) => {
  pgm.alterColumn("user_profiles", "status", {
    type: "varchar(20)",
    using: "status::varchar",
    default: "livre"
  });

  pgm.alterColumn("player_status_logs", "status", {
    type: "varchar(20)",
    using: "status::varchar"
  });

  pgm.dropType("player_status_type");
};
