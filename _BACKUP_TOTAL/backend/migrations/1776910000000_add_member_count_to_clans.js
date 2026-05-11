/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("clans", {
    member_count: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Contagem de membros do clã. Atualizado pelo backend ou triggers.",
    },
  });
  
  pgm.createIndex("clans", "member_count", { name: "idx_clans_member_count" });
};

exports.down = (pgm) => {
  pgm.dropIndex("clans", "member_count", { name: "idx_clans_member_count" });
  pgm.dropColumn("clans", "member_count");
};
