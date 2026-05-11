/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_sync_clan_member_count ON clan_members;
  `);

  pgm.sql(`
    DROP FUNCTION IF EXISTS sync_clan_member_count();
  `);

  pgm.sql(`
    DROP FUNCTION IF EXISTS sync_clan_member_count_on_delete();
  `);
};

exports.down = (pgm) => {
  // rollback opcional
};