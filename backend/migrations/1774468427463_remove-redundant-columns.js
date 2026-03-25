/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.dropColumns("clans", ["leader_id"]);
  pgm.dropColumns("user_profiles", ["username"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.addColumns("clans", {
    leader_id: { type: "uuid", references: "users(id)" },
  });
  pgm.addColumns("user_profiles", {
    username: { type: "varchar(50)", unique: true },
  });
};
