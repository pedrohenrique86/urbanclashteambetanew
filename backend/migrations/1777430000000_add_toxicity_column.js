exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS toxicity NUMERIC DEFAULT 0 NOT NULL;`);
};

exports.down = (pgm) => {
  pgm.dropColumn("user_profiles", "toxicity");
};
