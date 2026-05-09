const redisClient = require("../config/redisClient");
const { query } = require("../config/database");
const { getIO } = require("../socketHandler");

/**
 * logService.js
 * 
 * Sistema de log de alta performance (Batch Dirty).
 * Em vez de milhares de INSERTS por segundo, acumulamos em memória e persistimos em lote.
 */

const LOG_QUEUE_KEY = "queue:global_logs";
const FLUSH_INTERVAL = 20000; // 20 segundos
const MAX_BATCH_SIZE = 100;

class LogService {
  constructor() {
    this.isFlushing = false;
    
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => this.flushLogs(), FLUSH_INTERVAL);
    }
  }

  /**
   * Adiciona um log à fila (Redis).
   */
  async addLog(data) {
    const logEntry = {
      ...data,
      created_at: new Date().toISOString()
    };

    // 1. Enviar via Socket.IO (Tempo Real Instantâneo)
    const io = getIO();
    if (io) {
      io.emit("contract:log", logEntry);
    }

    // 2. Empilhar no Redis para persistência futura
    await redisClient.lPushAsync(LOG_QUEUE_KEY, JSON.stringify(logEntry));
  }

  /**
   * Persiste os logs no PostgreSQL em lote.
   */
  async flushLogs() {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const len = await redisClient.lLenAsync(LOG_QUEUE_KEY);
      if (len === 0) {
        this.isFlushing = false;
        return;
      }

      console.log(`[LogService] 💾 Persistindo lote de ${len} logs no PostgreSQL...`);
      
      const logs = [];
      // Pegamos até 100 logs por vez para não estourar a memória/query
      const count = Math.min(len, MAX_BATCH_SIZE);
      
      for (let i = 0; i < count; i++) {
        const raw = await redisClient.rPopAsync(LOG_QUEUE_KEY);
        if (raw) logs.push(JSON.parse(raw));
      }

      if (logs.length > 0) {
        // SÊNIOR: Batch Insert em uma única query (Ultra Rápido)
        const values = [];
        const placeholders = [];
        let idx = 1;

        logs.forEach(log => {
          placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7})`);
          values.push(
            log.user_id, 
            log.username, 
            log.faction, 
            log.event_type, 
            log.message, 
            log.territory_name, 
            log.is_major || false,
            log.created_at
          );
          idx += 8;
        });

        const sql = `
          INSERT INTO contract_logs (user_id, username, faction, event_type, message, territory_name, is_major, created_at)
          VALUES ${placeholders.join(',')}
        `;

        await query(sql, values);
      }

      console.log(`[LogService] ✅ ${logs.length} logs persistidos.`);
    } catch (err) {
      console.error("[LogService] ❌ Erro ao persistir logs:", err.message);
    } finally {
      this.isFlushing = false;
    }
  }
}

module.exports = new LogService();
