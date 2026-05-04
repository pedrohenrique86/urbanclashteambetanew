const { query } = require("../config/database");
const redisClient = require("../config/redisClient");

/**
 * actionLogService.js - ARQUITETURA SÊNIOR (Escala 5000+)
 * 
 * Centraliza o registro de auditoria com um sistema de duas camadas:
 * 1. Redis (L1): Cache ultra-rápido dos últimos 50 logs por usuário (UX).
 * 2. PostgreSQL (L2): Persistência em lote enviada a cada 10s (Auditoria 7 dias).
 */

const LOGS_USER_PREFIX  = "logs:user:";
const LOGS_QUEUE_KEY    = "logs:pending:queue";
const MAX_RECENT_LOGS   = 100;
const BATCH_INTERVAL_MS = 10000; // 10 segundos

class ActionLogService {
  /**
   * Registra uma nova ação.
   * SÊNIOR: Não toca no disco. Apenas memória (Redis).
   */
  async log(userId, actionType, entityType = null, entityId = null, metadata = {}, ipAddress = null) {
    try {
      const logEntry = {
        userId,
        actionType,
        entityType,
        entityId,
        metadata: JSON.stringify(metadata),
        ipAddress,
        createdAt: new Date().toISOString()
      };

      const userLogsKey = `${LOGS_USER_PREFIX}${userId}`;

      // 1. Camada UX: Salva no Redis para acesso instantâneo (100 últimos)
      const p = redisClient.pipeline();
      p.lPush(userLogsKey, JSON.stringify(logEntry));
      p.lTrim(userLogsKey, 0, MAX_RECENT_LOGS - 1);
      p.expire(userLogsKey, 60 * 60 * 24); // TTL de 24h para o cache de logs
      
      // 2. Camada Persistência: Enfileira para descarte no Banco em Lote
      p.rPush(LOGS_QUEUE_KEY, JSON.stringify(logEntry));
      
      await p.exec();
    } catch (err) {
      console.error(`[actionLogService] ⚠️ Erro ao registrar log em memória: ${err.message}`);
    }
  }

  /**
   * Recupera os logs recentes com suporte a Paginação.
   */
  async getRecentLogs(userId, page = 1, limit = 50) {
    try {
      const userLogsKey = `${LOGS_USER_PREFIX}${userId}`;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const cached = await redisClient.lRangeAsync(userLogsKey, start, end);

      if (cached && cached.length > 0) {
        return cached.map(raw => {
          const parsed = JSON.parse(raw);
          return {
            action_type: parsed.actionType,
            entity_type: parsed.entityType,
            entity_id:   parsed.entityId,
            metadata:    JSON.parse(parsed.metadata),
            created_at:  parsed.createdAt
          };
        });
      }

      // Fallback ao DB apenas se o Redis estiver vazio
      // SÊNIOR: Offset e Limit no Postgres para paginação de segurança.
      const result = await query(
        `SELECT action_type, entity_type, entity_id, metadata, created_at
         FROM action_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, start]
      );
      return result.rows;
    } catch (err) {
      console.error(`[actionLogService] Erro ao buscar logs:`, err.message);
      return [];
    }
  }

  /**
   * Worker: Descarrega a fila de logs no PostgreSQL em lotes.
   */
  async startLogWorker() {
    console.log(`[actionLogService] 🚀 Worker de Logs Ativo (Lote a cada ${BATCH_INTERVAL_MS/1000}s).`);
    
    // Ciclo de Persistência em Lote
    setInterval(async () => {
      try {
        const logsRaw = await redisClient.client.lRange(LOGS_QUEUE_KEY, 0, 99); // Processa até 100 logs por vez
        if (!logsRaw || logsRaw.length === 0) return;

        const logs = logsRaw.map(r => JSON.parse(r));
        
        // SÊNIOR: Bulk Insert de Alta Performance
        const placeholders = logs.map((_, i) => 
          `($${i*6 + 1}, $${i*6 + 2}, $${i*6 + 3}, $${i*6 + 4}, $${i*6 + 5}, $${i*6 + 6})`
        ).join(", ");

        const values = [];
        logs.forEach(l => {
          values.push(l.userId, l.actionType, l.entityType, l.entityId, l.metadata, l.ipAddress);
        });

        await query(
          `INSERT INTO action_logs (user_id, action_type, entity_type, entity_id, metadata, ip_address)
           VALUES ${placeholders}`,
          values
        );

        // Remove apenas o que processamos
        await redisClient.client.lTrim(LOGS_QUEUE_KEY, logs.length, -1);
        console.log(`[actionLogService] 💾 ${logs.length} logs persistidos no Postgres.`);
      } catch (err) {
        console.error(`[actionLogService] ❌ Erro no worker de persistência:`, err.message);
      }
    }, BATCH_INTERVAL_MS);

    // Ciclo de Limpeza (Daily Cleanup - 7 dias)
    const CLEANUP_INTERVAL = 1000 * 60 * 60 * 24; // 24 horas
    setInterval(async () => {
      try {
        const result = await query(`DELETE FROM action_logs WHERE created_at < NOW() - INTERVAL '7 days'`);
        console.log(`[actionLogService] 🧹 Cleanup realizado: ${result.rowCount} logs antigos removidos.`);
      } catch (err) {
        console.error(`[actionLogService] ❌ Erro no cleanup de logs:`, err.message);
      }
    }, CLEANUP_INTERVAL);
  }
}

const service = new ActionLogService();
// Inicia automaticamente no carregamento do módulo
service.startLogWorker();

module.exports = service;
