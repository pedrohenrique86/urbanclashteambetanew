const redisClient = require("../config/redisClient");
const { getIO } = require("../socketHandler");

/**
 * actionLogService.js - ARQUITETURA REDIS-ONLY
 * 
 * Centraliza o registro de auditoria utilizando exclusivamente o Redis.
 * Performance máxima com persistência garantida via AOF.
 */

const LOGS_USER_PREFIX  = "logs:user:";
const MAX_RECENT_LOGS   = 500; // Aumentado para 500 por usuário

class ActionLogService {

  /**
   * Registra uma nova ação.
   * Agora armazena exclusivamente no Redis com TTL de 7 dias.
   */
  async log(userId, actionType, entityType = null, entityId = null, metadata = {}, isPublic = false, ipAddress = null) {
    try {
      if (!redisClient.client.isReady) {
        await redisClient.redisReadyPromise;
      }

      const logEntry = {
        userId,
        actionType,
        entityType,
        entityId,
        metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
        isPublic,
        ipAddress,
        createdAt: new Date().toISOString()
      };

      // Se for público, emitir para o feed global via Socket.IO
      if (isPublic) {
        const io = getIO();
        if (io) {
          const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
          io.emit("contract:log", {
            id: `${logEntry.createdAt}-${userId}`,
            message: parsedMetadata.public_message || "Ação detectada na rede",
            event_type: actionType,
            created_at: logEntry.createdAt,
            is_major: !!(parsedMetadata.is_major || parsedMetadata.is_master),
            faction: parsedMetadata.faction || null,
            // Compatibilidade
            user_id: userId,
            metadata: parsedMetadata
          });
        }
      }

      const userLogsKey = `${LOGS_USER_PREFIX}${userId}`;

      // Salva no Redis (500 últimos por usuário)
      const p = redisClient.pipeline();
      p.lPush(userLogsKey, JSON.stringify(logEntry));
      p.lTrim(userLogsKey, 0, MAX_RECENT_LOGS - 1);
      p.expire(userLogsKey, 604800); // Retenção de 7 dias no Redis

      // Global Public Stream (Para Live Ticker e Contratos)
      if (isPublic) {
        const publicLogsKey = "cache:public_logs_stream";
        p.lPush(publicLogsKey, JSON.stringify(logEntry));
        p.lTrim(publicLogsKey, 0, 99); // Mantém os 100 mais recentes públicos
        p.expire(publicLogsKey, 86400); // 24h para feed público
      }
      
      await p.exec();
    } catch (err) {
      console.error(`[actionLogService] ❌ Erro ao registrar log: ${err.message}`);
    }
  }

  /**
   * Recupera os logs recentes do Redis.
   */
  async getRecentLogs(userId, page = 1, limit = 50) {
    try {
      const userLogsKey = `${LOGS_USER_PREFIX}${userId}`;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const cached = await redisClient.lRangeAsync(userLogsKey, start, end);

      if (!cached || cached.length === 0) return [];
      if (cached[0] === "EMPTY_MARKER") return [];

      return cached.map((raw, index) => {
        const parsed = JSON.parse(raw);
        return {
          id:          `${parsed.createdAt}-${parsed.actionType}-${index}`,
          action_type: parsed.actionType,
          entity_type: parsed.entityType,
          entity_id:   parsed.entityId,
          metadata:    typeof parsed.metadata === 'string' ? JSON.parse(parsed.metadata) : parsed.metadata,
          created_at:  parsed.createdAt
        };
      });
    } catch (err) {
      console.error(`[actionLogService] Erro ao buscar logs:`, err.message);
      return [];
    }
  }

  // Métodos de worker removidos pois não há mais persistência em SQL
  startLogWorker() { /* No-op */ }
}

const service = new ActionLogService();
module.exports = service;
