exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO items (name, code, description, type, rarity, base_price, base_attack_bonus, base_defense_bonus, base_focus_bonus)
    VALUES 
    ('Invasão de Cache', 'chip_invasao_cache', 'Chip tático que aumenta o poder total de invasão em 15%.', 'chip', 'rare', 5000, 15, 0, 0),
    ('Escudo Térmico', 'chip_escudo_termico', 'Reduz em 50% a perda de dinheiro em caso de derrota.', 'chip', 'uncommon', 3000, 0, 50, 0),
    ('Sobrecarga Neural', 'chip_sobrecarga_neural', 'Amplifica o ganho de XP em vitórias em 25%.', 'chip', 'rare', 4500, 0, 0, 25)
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM items WHERE type = 'chip';`);
};
