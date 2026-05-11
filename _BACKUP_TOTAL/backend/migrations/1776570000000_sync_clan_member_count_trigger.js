/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Função que recalcula o member_count do clã afetado
  pgm.sql(`
    CREATE OR REPLACE FUNCTION sync_clan_member_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        UPDATE clans
        SET member_count = (
          SELECT COUNT(*)
          FROM clan_members
          WHERE clan_id = OLD.clan_id
        )
        WHERE id = OLD.clan_id;

        RETURN OLD;
      ELSIF TG_OP = 'INSERT' THEN
        UPDATE clans
        SET member_count = (
          SELECT COUNT(*)
          FROM clan_members
          WHERE clan_id = NEW.clan_id
        )
        WHERE id = NEW.clan_id;

        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.clan_id IS DISTINCT FROM NEW.clan_id THEN
          UPDATE clans
          SET member_count = (
            SELECT COUNT(*)
            FROM clan_members
            WHERE clan_id = OLD.clan_id
          )
          WHERE id = OLD.clan_id;

          UPDATE clans
          SET member_count = (
            SELECT COUNT(*)
            FROM clan_members
            WHERE clan_id = NEW.clan_id
          )
          WHERE id = NEW.clan_id;
        END IF;

        RETURN NEW;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Remove trigger antigo, se existir
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_sync_clan_member_count ON clan_members;
  `);

  // Cria o trigger
  pgm.sql(`
    CREATE TRIGGER trg_sync_clan_member_count
    AFTER INSERT OR DELETE OR UPDATE OF clan_id
    ON clan_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_clan_member_count();
  `);

  // Corrige os contadores atuais uma vez
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
    DROP FUNCTION IF EXISTS sync_clan_member_count();
  `);
};