exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE items DROP CONSTRAINT chk_items_type;
    ALTER TABLE items ADD CONSTRAINT chk_items_type CHECK (type IN ('weapon', 'equipment', 'shield', 'consumable', 'chip'));

    ALTER TABLE items DROP CONSTRAINT chk_items_rarity;
    ALTER TABLE items ADD CONSTRAINT chk_items_rarity CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'));
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE items DROP CONSTRAINT chk_items_type;
    ALTER TABLE items ADD CONSTRAINT chk_items_type CHECK (type IN ('weapon', 'equipment', 'shield', 'consumable'));

    ALTER TABLE items DROP CONSTRAINT chk_items_rarity;
    ALTER TABLE items ADD CONSTRAINT chk_items_rarity CHECK (rarity IN ('common', 'rare', 'legendary'));
  `);
};
