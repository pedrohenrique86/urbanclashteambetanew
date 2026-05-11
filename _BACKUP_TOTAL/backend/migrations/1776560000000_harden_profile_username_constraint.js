/* eslint-disable camelcase */
exports.shorthands = undefined;

/**
 * Ajuste final de produção:
 * - deduplica user_profiles com CTID
 * - preenche username ausente
 * - reforça NOT NULL
 * - recria UNIQUE(username) com segurança
 */
exports.up = (pgm) => {
  // 1. Remove duplicados por user_id de forma segura
  pgm.sql(`
    DELETE FROM user_profiles
    WHERE ctid NOT IN (
      SELECT MIN(ctid)
      FROM user_profiles
      GROUP BY user_id
    );
  `);

  // 2. Sincroniza usernames existentes a partir de users
  pgm.sql(`
    UPDATE user_profiles p
    SET username = u.username
    FROM users u
    WHERE p.user_id = u.id
      AND (p.username IS NULL OR TRIM(p.username) = '');
  `);

  // 3. Fallback para registros órfãos ou inconsistentes
  pgm.sql(`
    UPDATE user_profiles
    SET username = 'user_' || REPLACE(user_id::text, '-', '')
    WHERE username IS NULL OR TRIM(username) = '';
  `);

  // 4. Remove constraint antiga, se existir, para recriação limpa
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_profiles_username_unique'
      ) THEN
        ALTER TABLE user_profiles
        DROP CONSTRAINT user_profiles_username_unique;
      END IF;
    END
    $$;
  `);

  // 5. Garante NOT NULL
  pgm.sql(`
    ALTER TABLE user_profiles
    ALTER COLUMN username SET NOT NULL;
  `);

  // 6. Recria UNIQUE(username)
  pgm.sql(`
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);
  `);
};

exports.down = (pgm) => {
  // Reverte apenas o endurecimento final, sem apagar a coluna
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_profiles_username_unique'
      ) THEN
        ALTER TABLE user_profiles
        DROP CONSTRAINT user_profiles_username_unique;
      END IF;
    END
    $$;
  `);

  pgm.sql(`
    ALTER TABLE user_profiles
    ALTER COLUMN username DROP NOT NULL;
  `);
};