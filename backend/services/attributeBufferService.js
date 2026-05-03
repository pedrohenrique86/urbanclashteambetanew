const { query } = require("../config/database");

/**
 * AttributeBufferService
 * 
 * Implementação de Buffered Write-Behind para atributos de jogadores.
 * Otimiza a performance acumulando deltas (incrementos/decrementos) em memória
 * e persistindo-os via Bulk Update no PostgreSQL a cada 3 segundos.
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
    if (this._timer.unref) this._timer.unref(); // Permite que o processo feche se apenas o timer estiver ativo
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
    this._isFlushing = true;

    // Snapshot e limpeza do buffer imediata para não perder novos deltas durante a IO
    const capturedBuffer = this._buffer;
    this._buffer = new Map();

    try {
      const userIds = Array.from(capturedBuffer.keys());
      const attributes = this._getUniqueAttributes(capturedBuffer);

      if (userIds.length === 0 || attributes.length === 0) return;

      /**
       * SÊNIOR: Bulk Update Atômico via CTE (Common Table Expression).
       * Este padrão permite atualizar múltiplas linhas em uma única viagem ao servidor,
       * aplicando deltas relativos (evitando sobrescrições se o valor mudar no meio tempo).
       */
      const queryStr = this._buildBulkUpdateQuery(capturedBuffer, userIds, attributes);
      const values = this._buildFlattenedValues(capturedBuffer, userIds, attributes);

      await query(queryStr, values);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Write-Behind] ✅ Persistidos deltas para ${userIds.length} jogadores.`);
      }
    } catch (err) {
      console.error("[Write-Behind] ❌ Erro ao persistir lote de atributos:", err.message);
      // Opcional: Re-inserir no buffer em caso de erro crítico de conexão
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

  /**
   * Constrói a query de Bulk Update atômico.
   * Ex: UPDATE p SET money = p.money + u.money FROM (VALUES ($1, $2), ...) u...
   */
  _buildBulkUpdateQuery(buffer, userIds, attributes) {
    const numAttrs = attributes.length;
    const valuePlaceholders = [];
    
    // Gera ($1, $2, $3, ...), ($4, $5, $6, ...)
    userIds.forEach((_, i) => {
      const offset = i * (numAttrs + 1);
      const row = [`$${offset + 1}`]; // Primeiro é o userId
      for (let j = 0; j < numAttrs; j++) {
        row.push(`$${offset + j + 2}`);
      }
      valuePlaceholders.push(`(${row.join(", ")})`);
    });

    const setClauses = attributes.map(attr => `${attr} = user_profiles.${attr} + vals.${attr}_delta`);

    return `
      UPDATE user_profiles
      SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
      FROM (VALUES ${valuePlaceholders.join(", ")}) AS vals(user_id, ${attributes.map(a => `${a}_delta`).join(", ")})
      WHERE user_profiles.user_id = vals.user_id::uuid
    `;
  }

  _buildFlattenedValues(buffer, userIds, attributes) {
    const values = [];
    userIds.forEach(userId => {
      values.push(userId);
      const userData = buffer.get(userId);
      attributes.forEach(attr => {
        values.push(userData[attr] || 0); // Delta 0 se o usuário não tiver esse atributo no lote
      });
    });
    return values;
  }
}

// Singleton para o sistema
const attributeBufferService = new AttributeBufferService();

module.exports = attributeBufferService;
