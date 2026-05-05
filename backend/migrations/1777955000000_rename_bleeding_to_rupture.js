/**
 * Renomeia o status 'Sangrando' para 'Ruptura' no ENUM player_status_type.
 * Isso garante compatibilidade com o novo tema Cyberpunk Militar.
 */

exports.up = async (pgm) => {
  // Renomeia o valor no ENUM
  // Nota: RENAME VALUE requer PostgreSQL 10+
  pgm.sql("ALTER TYPE player_status_type RENAME VALUE 'Sangrando' TO 'Ruptura'");
};

exports.down = async (pgm) => {
  // Reverte para 'Sangrando'
  pgm.sql("ALTER TYPE player_status_type RENAME VALUE 'Ruptura' TO 'Sangrando'");
};
