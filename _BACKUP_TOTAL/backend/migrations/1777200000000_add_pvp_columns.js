exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('user_profiles', {
    recovery_ends_at: { type: 'timestamp', default: null },
    shield_ends_at: { type: 'timestamp', default: null }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('user_profiles', ['recovery_ends_at', 'shield_ends_at']);
};
