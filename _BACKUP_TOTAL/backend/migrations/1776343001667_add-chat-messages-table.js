/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("chat_messages", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    clan_id: { type: "uuid", references: '"clans"', onDelete: "CASCADE", notNull: true },
    user_id: { type: "uuid", references: '"users"', onDelete: "CASCADE", notNull: true },
    text: { type: "text", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP"), notNull: true },
  });

  pgm.createIndex("chat_messages", "clan_id");
  pgm.createIndex("chat_messages", "created_at");
};

exports.down = (pgm) => {
  pgm.dropTable("chat_messages");
};
