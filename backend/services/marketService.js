const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const marketStateService = require("./marketStateService");
const sseService = require("./sseService");

/**
 * Bolsa Sombria: Serviço para compra e venda de itens tecnológicos.
 */
class MarketService {
  /**
   * Retorna os itens disponíveis no mercado com seus preços atuais e estoque global (Redis).
   */
  async getMarketItems() {
    const { rows } = await query(
      `SELECT id, code, name, description, type, rarity, base_price 
       FROM items 
       WHERE code IN (
         'cabos_cobre', 'placas_mae_queimadas', 'sucata_placa_video', 'chips_defeituosos',
         'baterias_litio', 'fiacao_fibra_otica', 'pecas_drone', 'modulos_memoria',
         'motores_passo_precisao', 'processadores_basicos', 'biomaterial_bruto',
         'sensores_otica_avancada', 'neuro_chips', 'circuitos_integrados_raros', 'drives_ouro'
       )
       ORDER BY base_price ASC`
    );

    // SÊNIOR: Injeta o estoque atualizado vindo do Redis
    for (const item of rows) {
      item.market_stock = await marketStateService.getStock(item.code);
    }

    return rows;
  }

  /**
   * Compra um item do mercado (Redis-First: Ultra Escalável).
   */
  async buyItem(userId, itemCode, quantity) {
    if (quantity <= 0) throw new Error("Quantidade inválida.");

    // 1. Verificar preço e nome
    const { rows: itemRows } = await query(
      "SELECT id, name, base_price FROM items WHERE code = $1", 
      [itemCode]
    );
    if (itemRows.length === 0) throw new Error("Item não encontrado.");
    const item = itemRows[0];
    const totalPrice = item.base_price * quantity;

    // 2. Tentar deduzir estoque no Redis (Atômico & Instantâneo)
    // Se não houver estoque, o updateStock lança erro "Estoque global insuficiente".
    const newStock = await marketStateService.updateStock(itemCode, -quantity);

    // 3. Processar transação financeira do jogador
    try {
      await playerStateService.updatePlayerState(userId, { money: -totalPrice });
      await inventoryService.addItem(userId, itemCode, quantity);
    } catch (err) {
      // ROLLBACK REDIS: Se a transação do jogador falhar (ex: sem dinheiro), devolvemos o estoque
      await marketStateService.updateStock(itemCode, quantity);
      throw err;
    }

    // 4. BROADCAST: Notifica todos os jogadores (SSE)
    sseService.broadcast("market:update", { itemCode, newStock });

    return {
      message: `Você comprou ${quantity}x ${item.name} por $${totalPrice.toLocaleString()}.`,
      totalPrice,
      newStock
    };
  }

  /**
   * Vende um item para o mercado (Redis-First).
   */
  async sellItem(userId, itemCode, quantity) {
    if (quantity <= 0) throw new Error("Quantidade inválida.");

    const { rows: itemRows } = await query("SELECT id, name, base_price FROM items WHERE code = $1", [itemCode]);
    if (itemRows.length === 0) throw new Error("Item não encontrado.");
    const item = itemRows[0];

    const sellPrice = Math.floor(item.base_price * 0.9);
    const totalReturn = sellPrice * quantity;

    // Verificar se o jogador tem os itens
    const inventory = await inventoryService.getInventory(userId);
    const playerItem = inventory.find(i => i.code === itemCode);

    if (!playerItem || playerItem.quantity < quantity) {
      throw new Error("Você não possui itens suficientes para vender.");
    }

    // 1. Remover do inventário
    await inventoryService.removeItem(userId, itemCode, quantity);

    // 2. Adicionar estoque ao mercado no Redis (Instantâneo)
    const newStock = await marketStateService.updateStock(itemCode, quantity);

    // 3. Adicionar dinheiro ao jogador
    await playerStateService.updatePlayerState(userId, { money: totalReturn });

    // 4. BROADCAST: Notifica todos os jogadores (SSE)
    sseService.broadcast("market:update", { itemCode, newStock });

    return {
      message: `Você vendeu ${quantity}x ${item.name} por $${totalReturn.toLocaleString()}.`,
      totalReturn,
      newStock
    };
  }
}

module.exports = new MarketService();
