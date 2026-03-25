/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('user_profiles', {
    display_name: { type: 'varchar(100)' },
    bio: { type: 'text' },
    level: { type: 'integer', default: 1 },
    experience_points: { type: 'integer', default: 0 },
    faction: { type: 'varchar(50)' },
    attack: { type: 'numeric', default: 0 },
    defense: { type: 'numeric', default: 0 },
    focus: { type: 'numeric', default: 0 },
    intimidation: { type: 'numeric', default: 0 },
    discipline: { type: 'numeric', default: 0 },
    critical_chance: { type: 'numeric', default: 0 },
    critical_damage: { type: 'numeric', default: 150 },
    energy: { type: 'integer', default: 100 },
    current_xp: { type: 'integer', default: 0 },
    xp_required: { type: 'integer', default: 100 },
    action_points: { type: 'integer', default: 20000 },
    money: { type: 'integer', default: 1000 },
    money_daily_gain: { type: 'integer', default: 0 },
    victories: { type: 'integer', default: 0 },
    defeats: { type: 'integer', default: 0 },
    winning_streak: { type: 'integer', default: 0 },
    action_points_reset_time: {
      type: 'timestamp',
      default: pgm.func('current_timestamp'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('user_profiles', [
    'display_name',
    'bio',
    'level',
    'experience_points',
    'faction',
    'attack',
    'defense',
    'focus',
    'intimidation',
    'discipline',
    'critical_chance',
    'critical_damage',
    'energy',
    'current_xp',
    'xp_required',
    'action_points',
    'money',
    'money_daily_gain',
    'victories',
    'defeats',
    'winning_streak',
    'action_points_reset_time',
  ]);
};