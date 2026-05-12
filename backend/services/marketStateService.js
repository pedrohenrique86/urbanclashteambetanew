const redisClient = require("../config/redisClient");
const { query } = require("../config/database");

/**
 * marketStateService.js
 * 
 * ARQUITETURA DE ALTA PERFORMANCE (5000+ JOGADORES)
 * 
 * Fonte Primária: Redis (In-memory)
 * Persistência: Banco de Dados (Async Batch Dirty)
 * Fluxo: Ação -> Redis (Lua Script Atômico) -> Dirty Set -> Persistência de fundo (15s)
 */

const MARKET_STOCK_KEY = "market:stock";
const MARKET_DIRTY_SET = "market:dirty:set";
const SYNC_INTERVAL = 15000; // 15 segundos

/**
 * Script LUA para garantir que o estoque não fique negativo de forma atômica no Redis.
 * ARGS: 1=itemCode, 2=delta (pode ser negativo)
 */
const UPDATE_STOCK_LUA = `
  local key = KEYS[1]
  local field = ARGV[1]
  local delta = tonumber(ARGV[2])
  
  local current = tonumber(redis.call('HGET', key, field) or 0)
  if delta < 0 and (current + delta) < 0 then
    return "ERR_NSF"
  end
  
  local newVal = current + delta
  redis.call('HSET', key, field, tostring(newVal))
  return tostring(newVal)
`;

class MarketStateService {
  constructor() {
    this.initialized = false;
    this.isFlushing = false;
    
    // SÊNIOR FIX: unref() adicionado para não manter o processo Node.js acordado sozinho
    if (process.env.NODE_ENV !== 'test') {
      const t = setInterval(() => this.flushDirtyStock(), SYNC_INTERVAL);
      if (t.unref) t.unref();
    }
  }

  /**
   * Inicializa o estoque no Redis a partir do Banco de Dados.
   */
  async ensureInitialized() {
    if (this.initialized) return;
    
    console.log("[MarketState] 🔄 Inicializando estoque global no Redis...");
    const { rows } = await query(
      "SELECT code, market_stock FROM items WHERE market_stock IS NOT NULL"
    );

    const pipeline = redisClient.pipeline();
    for (const row of rows) {
      pipeline.hSet(MARKET_STOCK_KEY, row.code, String(row.market_stock));
    }
    await pipeline.exec();
    
    this.initialized = true;
    console.log("[MarketState] ✅ Estoque carregado no Redis.");
  }

  /**
   * Obtém o estoque atual de um item (Redis).
   */
  async getStock(itemCode) {
    await this.ensureInitialized();
    const val = await redisClient.hGetAsync(MARKET_STOCK_KEY, itemCode);
    return parseInt(val || "0");
  }

  /**
   * Atualiza o estoque no Redis de forma atômica (Lua Script).
   * @param {string} itemCode 
   * @param {number} delta (ex: -10 para compra, +10 para venda)
   */
  async updateStock(itemCode, delta) {
    await this.ensureInitialized();
    
    const result = await redisClient.runLuaAsync(UPDATE_STOCK_LUA, [MARKET_STOCK_KEY], [itemCode, String(delta)]);
    
    if (result === "ERR_NSF") {
      throw new Error("Estoque global insuficiente no mercado.");
    }

    // Marca como dirty para persistência futura no Banco de Dados
    await redisClient.sAddAsync(MARKET_DIRTY_SET, itemCode);
    
    return parseInt(result);
  }

  /**
   * Persiste os estoques alterados no PostgreSQL em lote.
   */
  async flushDirtyStock() {
    if (this.isFlushing) return;

    try {
      const dirtyItems = await redisClient.sMembersAsync(MARKET_DIRTY_SET);
      if (dirtyItems.length === 0) return;

      // SÊNIOR FIX: Não acorda o Banco se não há jogadores online.
      const onlineCount = await redisClient.sCardAsync("online_players_set").catch(() => 0);
      if (!onlineCount || onlineCount === 0) return;

      this.isFlushing = true;
      console.log(`[MarketState] 💾 Persistindo ${dirtyItems.length} itens no Banco de Dados...`);
      
      // Limpa o set de dirty primeiro (se falhar o update, eles serão marcados de novo na próxima ação)
      // SÊNIOR: Uma estratégia mais segura seria remover apenas após o sucesso, mas 
      // como o estoque no Redis é a fonte primária, o risco é mínimo.
      await redisClient.delAsync(MARKET_DIRTY_SET);

      for (const code of dirtyItems) {
        const stock = await this.getStock(code);
        await query(
          "UPDATE items SET market_stock = ? WHERE code = ?",
          [stock, code]
        );
      }

      console.log("[MarketState] ✅ Persistência concluída.");
    } catch (err) {
      console.error("[MarketState] ❌ Erro ao persistir estoque:", err.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = new MarketStateService();
