/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Fix: Garantir que um usuário só possa estar em UM clã por vez.
 * Isso habilita a cláusula ON CONFLICT (user_id) usada no backend.
 */
exports.up = (pgm) => {
  // Adiciona a constraint UNIQUE na coluna user_id
  // Isso impede duplicatas e resolve o erro de "no unique constraint matching the ON CONFLICT specification"
  pgm.addConstraint("clan_members", "clan_members_user_id_unique", {
    unique: "user_id",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("clan_members", "clan_members_user_id_unique");
};
