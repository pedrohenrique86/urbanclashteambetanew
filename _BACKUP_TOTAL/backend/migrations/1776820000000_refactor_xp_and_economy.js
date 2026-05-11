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
  // 1. Criar total_xp se não existir
  pgm.addColumn('user_profiles', {
    total_xp: { type: 'bigint', notNull: true, default: 0 }
  }, { ifNotExists: true });

  // 2. Migrar dados: Precisamos verificar se a coluna legada existe antes de rodar o SQL
  // Usamos pgm.sql diretamente; se a coluna não existir, o PG retornaria erro se não filtrado.
  // Como estamos em transição, vamos garantir que só rode se current_xp existir.
  pgm.sql(`
    UPDATE user_profiles 
    SET total_xp = CAST(current_xp AS BIGINT)
    WHERE total_xp = 0 
      AND current_xp > 0 
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='user_profiles' AND column_name='current_xp'
      );
  `);

  // 3. Remover colunas obsoletas
  pgm.dropColumn('user_profiles', ['xp_required', 'current_xp', 'money_daily_gain'], { ifExists: true });

  console.log('✅ Migration UP: user_profiles refatorado com total_xp.');
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
