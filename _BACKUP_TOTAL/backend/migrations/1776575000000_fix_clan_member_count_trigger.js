/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Remove trigger antiga (se existir)
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_sync_clan_member_count ON clan_members;
  `);

  // 2. Remove função antiga (se existir)
  pgm.sql(`
    DROP FUNCTION IF EXISTS sync_clan_member_count();
  `);

  // 3. Cria função nova (somente DELETE)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION sync_clan_member_count_on_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE clans
      SET member_count = (
        SELECT COUNT(*)
        FROM clan_members
        WHERE clan_id = OLD.clan_id
      )
      WHERE id = OLD.clan_id;

      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 4. Cria trigger nova (somente DELETE)
  pgm.sql(`
    CREATE TRIGGER trg_sync_clan_member_count
    AFTER DELETE ON clan_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_clan_member_count_on_delete();
  `);

  // 5. Corrige dados atuais (MUITO IMPORTANTE)
  pgm.sql(`
    UPDATE clans c
    SET member_count = (
      SELECT COUNT(*)
      FROM clan_members cm
      WHERE cm.clan_id = c.id
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_sync_clan_member_count ON clan_members;
  `);

  pgm.sql(`
    DROP FUNCTION IF EXISTS sync_clan_member_count_on_delete();
  `);
};