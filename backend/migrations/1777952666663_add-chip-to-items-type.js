exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE items DROP CONSTRAINT chk_items_type;
    ALTER TABLE items ADD CONSTRAINT chk_items_type CHECK (type IN ('weapon', 'equipment', 'shield', 'consumable', 'chip'));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE items DROP CONSTRAINT chk_items_type;
    ALTER TABLE items ADD CONSTRAINT chk_items_type CHECK (type IN ('weapon', 'equipment', 'shield', 'consumable'));
  `);
};
