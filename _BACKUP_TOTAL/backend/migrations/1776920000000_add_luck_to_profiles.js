exports.up = (pgm) => {
  pgm.addColumns("user_profiles", {
    luck: {
      type: "NUMERIC",
      default: 0,
      notNull: true,
      comment: "Atributo de sorte que afeta recompensas, loot de caixas e eventos aleatórios",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("user_profiles", ["luck"]);
};
