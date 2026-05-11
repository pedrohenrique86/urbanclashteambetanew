/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("user_profiles", {
    training_ends_at: {
      type: "timestamptz",
      notNull: false,
      comment: "Horário em que o treino atual termina.",
    },
    daily_training_count: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Número de treinos realizados no dia atual.",
    },
    last_training_reset: {
      type: "date",
      notNull: true,
      default: pgm.func("CURRENT_DATE"),
      comment: "Data do último reset do contador diário de treinos.",
    },
    active_training_type: {
      type: "varchar(20)",
      notNull: false,
      comment: "Tipo de treino ativo (pequeno, medio, grande).",
    },
  });

  pgm.createIndex("user_profiles", "training_ends_at", { name: "idx_user_profiles_training_ends_at" });
};

exports.down = (pgm) => {
  pgm.dropIndex("user_profiles", "training_ends_at", { name: "idx_user_profiles_training_ends_at" });
  pgm.dropColumn("user_profiles", [
    "training_ends_at",
    "daily_training_count",
    "last_training_reset",
    "active_training_type",
  ]);
};
