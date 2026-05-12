const { query } = require("../config/database");

/**
 * AttributeBufferService
 * 
 * Implementação de Buffered Write-Behind para atributos de jogadores.
 * Otimiza a performance acumulando deltas (incrementos/decrementos) em memória
 * e persistindo-os via Bulk Update no Banco de Dados a cada 3 segundos.
 * 
 * Vantagens:
 * 1. Redução drástica de IO no Banco de Dados (de 1000 UPDATES para 1 único Bulk Update).
 * 2. Operações atômicas no nível do SQL (SET attr = attr + delta).
 * 3. Não bloqueia a thread principal (Processamento assíncrono).
 */
class AttributeBufferService {
  constructor(flushInterval = 3000) {
    this._buffer = new Map(); // userId -> { attr: value }
    this._flushInterval = flushInterval;
    this._isFlushing = false;
    this._timer = null;

    this.start();
  }

  /**
   * Registra um delta para um atributo de um jogador.
   * @param {string} userId UUID do jogador
   * @param {string} attribute Nome da coluna no banco (ex: 'money', 'energy', 'total_xp')
   * @param {number} delta Valor a ser somado (aceita negativos)
   */
  recordDelta(userId, attribute, delta) {
    if (typeof delta !== "number" || isNaN(delta)) return;

    if (!this._buffer.has(userId)) {
      this._buffer.set(userId, {});
    }

    const playerBuffer = this._buffer.get(userId);
    playerBuffer[attribute] = (playerBuffer[attribute] || 0) + delta;
  }

  /**
   * Inicia o ciclo de flush automático.
   */
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.flush(), this._flushInterval);
    if (this._timer.unref) this._timer.unref(); // SÊNIOR FIX: adicionado unref() (estava faltando) para não manter o processo acordado
  }

  /**
   * Para o ciclo de flush.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Executa a persistência em lote.
   */
  async flush() {
    if (this._isFlushing || this._buffer.size === 0) return;

    // SÊNIOR FIX: Não acorda o Banco se não há jogadores online.
    // Buffers só existem durante sessões ativas, mas verificamos por segurança.
    try {
      const redisClient = require("../config/redisClient");
      const onlineCount = await redisClient.sCardAsync("online_players_set").catch(() => 0);
      if (!onlineCount || onlineCount === 0) return;
    } catch (_) {
      // Se o Redis falhar, permite o flush (não bloqueia persistência)
    }

    this._isFlushing = true;

    // Snapshot e limpeza do buffer imediata para não perder novos deltas durante a IO
    const capturedBuffer = this._buffer;
    this._buffer = new Map();

    try {
      const userIds = Array.from(capturedBuffer.keys());
      const attributes = this._getUniqueAttributes(capturedBuffer);

      if (userIds.length === 0 || attributes.length === 0) return;

      const { transaction } = require("../config/database");

      // SÊNIOR: No SQLite, para manter a atomicidade e performance do "SET attr = attr + delta",
      // usamos uma transação de escrita e processamos cada usuário do buffer individualmente.
      await transaction(async (tx) => {
        for (const userId of userIds) {
          const userData = capturedBuffer.get(userId);
          const activeAttrs = Object.keys(userData);
          
          if (activeAttrs.length === 0) continue;

          const setClauses = activeAttrs.map(attr => `"${attr}" = "${attr}" + ?`);
          const values = activeAttrs.map(attr => userData[attr]);
          values.push(userId);

          await tx.query(
            `UPDATE user_profiles 
             SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ?`,
            values
          );
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Write-Behind] ✅ Persistidos deltas para ${userIds.length} jogadores (SQLite).`);
      }
    } catch (err) {
      console.error("[Write-Behind] ❌ Erro ao persistir lote de atributos:", err.message);
    } finally {
      this._isFlushing = false;
    }
  }

  _getUniqueAttributes(buffer) {
    const attrs = new Set();
    buffer.forEach(userData => {
      Object.keys(userData).forEach(attr => attrs.add(attr));
    });
    return Array.from(attrs);
  }
}

// Singleton para o sistema
const attributeBufferService = new AttributeBufferService();

module.exports = attributeBufferService;
