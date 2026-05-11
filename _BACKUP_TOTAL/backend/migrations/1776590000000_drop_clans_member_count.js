/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropColumn("clans", "member_count");
};

exports.down = (pgm) => {
  pgm.addColumn("clans", {
    member_count: {
      type: "integer",
      notNull: true,
      default: 0,
    },
  });
};