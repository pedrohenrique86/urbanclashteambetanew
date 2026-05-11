/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Migration de Consolidação Técnica
 * Objetivo:
 * - Padronizar chat_messages.created_at para TIMESTAMPTZ
 * - Criar índice composto ideal para a query do chat
 * - Garantir users.password_hash anulável para Social Login
 */
exports.up = (pgm) => {
  // 1) Padronização segura de timezone no chat
  // Assumimos que os valores atuais de created_at devem ser interpretados como UTC.
  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'UTC';
  `);

  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  `);

  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at SET NOT NULL;
  `);

  // 2) Índice composto ideal para o fluxo real do chat
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_clan_created_at
    ON chat_messages (clan_id, created_at DESC);
  `);

  // 3) Permitir password_hash nulo para login social
  pgm.sql(`
    ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;
  `);
};

exports.down = (pgm) => {
  // 1) Remover índice composto do chat
  pgm.sql(`
    DROP INDEX IF EXISTS idx_chat_messages_clan_created_at;
  `);

  // 2) Reverter created_at para TIMESTAMP sem timezone
  // Mantendo a interpretação em UTC para evitar deslocamento inesperado no rollback.
  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at TYPE TIMESTAMP
    USING created_at AT TIME ZONE 'UTC';
  `);

  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
  `);

  pgm.sql(`
    ALTER TABLE chat_messages
    ALTER COLUMN created_at SET NOT NULL;
  `);

  // 3) Reaplicar NOT NULL em password_hash somente se não houver nulos
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE password_hash IS NULL
        LIMIT 1
      ) THEN
        ALTER TABLE users
        ALTER COLUMN password_hash SET NOT NULL;
      END IF;
    END
    $$;
  `);
};