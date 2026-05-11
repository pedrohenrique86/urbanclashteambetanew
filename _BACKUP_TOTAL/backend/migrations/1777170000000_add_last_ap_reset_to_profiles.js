/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("user_profiles", {
    last_ap_reset: {
      type: "date",
      notNull: true,
      default: pgm.func("CURRENT_DATE"),
      comment: "Data do último reset diário de Pontos de Ação (AP).",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("user_profiles", "last_ap_reset");
};
