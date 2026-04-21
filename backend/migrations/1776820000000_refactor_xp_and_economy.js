/* eslint-disable camelcase */

/**
 * MIGRATION - Refatoração de XP e Economia
 * 
 * Objetivo: Transição para um sistema de XP acumulado (total_xp) e remoção de redundâncias.
 * 
 * Alterações:
 * 1. Adição de 'total_xp' (BIGINT) para suportar progressão de longo prazo.
 * 2. Migração de dados legados de 'current_xp' para 'total_xp'.
 * 3. Remoção de colunas obsoletas: 'xp_required', 'current_xp', 'money_daily_gain'.
 * 
 * Motivação:
 * - xp_required e current_xp (nível atual) agora são calculados dinamicamente no backend.
 * - total_xp passa a ser a única fonte de verdade para o XP total acumulado.
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Criar total_xp se não existir (Idempotência)
  // Usamos BIGINT para evitar overflow em jogos de longa progressão
  pgm.sql(`
    ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS total_xp BIGINT NOT NULL DEFAULT 0;
  `);

  // 2. Preservação de Dados: Migrar current_xp para total_xp
  // Fazemos isso apenas se total_xp ainda estiver zerado e a coluna legada existir
  pgm.sql(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='current_xp') THEN
        UPDATE user_profiles 
        SET total_xp = CAST(current_xp AS BIGINT)
        WHERE total_xp = 0 AND current_xp > 0;
      END IF;
    END $$;
  `);

  // 3. Remover colunas obsoletas
  // Usamos ifExists para garantir idempotência
  pgm.dropColumn('user_profiles', ['xp_required', 'current_xp', 'money_daily_gain'], { ifExists: true });

  console.log('✅ Migration UP: user_profiles refatorado. total_xp adicionado e colunas obsoletas removidas.');
};

exports.down = async (pgm) => {
  // 1. Recriar colunas removidas (Rollback do schema)
  pgm.addColumn('user_profiles', {
    xp_required: { type: 'integer', notNull: false, default: 100 },
    current_xp: { type: 'integer', notNull: false, default: 0 },
    money_daily_gain: { type: 'integer', notNull: false, default: 0 },
  }, { ifNotExists: true });

  // 2. Tentar restaurar o estado mais próximo possível
  // current_xp recebe o valor de total_xp (truncado de volta para integer)
  pgm.sql(`
    UPDATE user_profiles 
    SET current_xp = CASE 
      WHEN total_xp > 2147483647 THEN 2147483647 
      ELSE CAST(total_xp AS INTEGER) 
    END
    WHERE total_xp > 0;
  `);

  // 3. Remover total_xp
  pgm.dropColumn('user_profiles', 'total_xp', { ifExists: true });

  console.log('⏪ Migration DOWN: user_profiles restaurado para estrutura legada.');
};
