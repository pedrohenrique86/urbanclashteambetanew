const { query } = require("../config/database");
const playerStateService = require("./playerStateService");
const inventoryService = require("./inventoryService");
const marketStateService = require("./marketStateService");
const sseService = require("./sseService");
const catalogService = require("./catalogService");
const marketHistoryService = require("./marketHistoryService");

/**
 * Bolsa Sombria: Serviço para compra e venda de itens tecnológicos.
 */
class MarketService {
  /**
   * Retorna os itens disponíveis no mercado com seus preços atuais e estoque global (Redis).
   */
  async getMarketItems() {
    const allItems = await catalogService.getItems();
    
    // Filtra apenas os itens que pertencem ao mercado ( Bolsa Sombria )
    const marketCodes = [
      'cabos_cobre', 'placas_mae_queimadas', 'sucata_placa_video', 'chips_defeituosos',
      'baterias_litio', 'fiacao_fibra_otica', 'pecas_drone', 'modulos_memoria',
      'motores_passo_precisao', 'processadores_basicos', 'biomaterial_bruto',
      'sensores_otica_avancada', 'neuro_chips', 'circuitos_integrados_raros', 'drives_ouro'
    ];

    const rows = allItems.filter(i => marketCodes.includes(i.code));

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

    const item = await catalogService.getItemByCode(itemCode);
    if (!item) throw new Error("Item não encontrado.");
    
    const totalPrice = item.base_price * quantity;
    const newStock = await marketStateService.updateStock(itemCode, -quantity);

    try {
      await playerStateService.updatePlayerState(userId, { money: -totalPrice });
      await inventoryService.addItem(userId, itemCode, quantity);
    } catch (err) {
      await marketStateService.updateStock(itemCode, quantity);
      throw err;
    }

    sseService.broadcast("market:update", { itemCode, newStock });

    const playerState = await playerStateService.getPlayerState(userId);
    await marketHistoryService.logTransaction(userId, playerState.username, itemCode, item.name, quantity, totalPrice, 'buy');

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

    const item = await catalogService.getItemByCode(itemCode);
    if (!item) throw new Error("Item não encontrado.");

    const sellPrice = Math.floor(item.base_price * 0.9);
    const totalReturn = sellPrice * quantity;

    const inventory = await inventoryService.getInventory(userId);
    const playerItem = inventory.find(i => i.code === itemCode);

    if (!playerItem || playerItem.quantity < quantity) {
      throw new Error("Você não possui itens suficientes para vender.");
    }

    await inventoryService.removeItem(userId, itemCode, quantity);
    const newStock = await marketStateService.updateStock(itemCode, quantity);
    await playerStateService.updatePlayerState(userId, { money: totalReturn });

    sseService.broadcast("market:update", { itemCode, newStock });

    const playerState = await playerStateService.getPlayerState(userId);
    await marketHistoryService.logTransaction(userId, playerState.username, itemCode, item.name, quantity, totalReturn, 'sell');

    return {
      message: `Você vendeu ${quantity}x ${item.name} por $${totalReturn.toLocaleString()}.`,
      totalReturn,
      newStock
    };
  }
}

module.exports = new MarketService();
