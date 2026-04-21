/* eslint-disable camelcase */

/**
 * MIGRATION - LIMPEZA FINAL E PADRONIZAÇÃO XP/AP
 * 
 * 1. Garante integridade do total_xp migrando dados de experience_points/current_xp.
 * 2. Remove colunas obsoletas: experience_points, xp_required, current_xp, money_daily_gain, action_points_reset_time.
 * 3. Idempotente e segura.
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Garantir que total_xp está populado com o melhor dado disponível antes de deletar o resto
  // Usamos GREATEST para pegar o maior valor entre as colunas redundantes
  pgm.sql(`
    UPDATE user_profiles 
    SET total_xp = GREATEST(
      total_xp, 
      COALESCE(CAST(current_xp AS BIGINT), 0), 
      COALESCE(CAST(experience_points AS BIGINT), 0)
    )
    WHERE total_xp = 0 OR total_xp IS NULL;
  `);

  // 2. Remoção das colunas obsoletas
  pgm.dropColumn('user_profiles', [
    'experience_points',
    'xp_required',
    'current_xp',
    'money_daily_gain',
    'action_points_reset_time'
  ], { ifExists: true });

  console.log('✅ Migration UP: Colunas legadas removidas e total_xp consolidado.');
};

exports.down = async (pgm) => {
  // 1. Reverter colunas (Rollback de emergência)
  pgm.addColumn('user_profiles', {
    experience_points: { type: 'integer', default: 0 },
    xp_required: { type: 'integer', default: 100 },
    current_xp: { type: 'integer', default: 0 },
    money_daily_gain: { type: 'integer', default: 0 },
    action_points_reset_time: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  }, { ifNotExists: true });

  console.log('⏪ Migration DOWN: Colunas legadas restauradas.');
};
