const { query } = require("../config/database");

/**
 * Adiciona um item ao inventário do jogador.
 */
async function addItem(userId, itemCode, quantity = 1) {
  const { rows } = await query("SELECT id FROM items WHERE code = $1", [itemCode]);
  if (rows.length === 0) {
    console.error(`[Inventory] Item não encontrado: ${itemCode}`);
    return;
  }
  const itemId = rows[0].id;

  await query(
    `INSERT INTO player_inventory (user_id, item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, item_id) DO UPDATE 
     SET quantity = player_inventory.quantity + $3`,
    [userId, itemId, quantity]
  );
}

/**
 * Remove um item do inventário do jogador.
 */
async function removeItem(userId, itemCode, quantity = 1) {
  const { rows } = await query("SELECT id FROM items WHERE code = $1", [itemCode]);
  if (rows.length === 0) return;
  const itemId = rows[0].id;

  await query(
    `UPDATE player_inventory 
     SET quantity = GREATEST(0, quantity - $3)
     WHERE user_id = $1 AND item_id = $2`,
    [userId, itemId, quantity]
  );
}

/**
 * Retorna o inventário do jogador.
 */
async function getInventory(userId) {
  const { rows } = await query(
    `SELECT i.name, i.code, i.type, i.rarity, pi.quantity 
     FROM player_inventory pi
     JOIN items i ON pi.item_id = i.id
     WHERE pi.user_id = $1 AND pi.quantity > 0`,
    [userId]
  );
  return rows;
}

module.exports = {
  addItem,
  removeItem,
  getInventory
};
