const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const { getIO } = require("../socketHandler");

/**
 * actionLogService.js - ARQUITETURA SÊNIOR (Escala 5000+)
 * 
 * Centraliza o registro de auditoria com um sistema de duas camadas:
 * 1. Redis (L1): Cache ultra-rápido dos últimos 100 logs por usuário (UX).
 * 2. PostgreSQL (L2): Persistência em lote enviada a cada 10s (Auditoria 7 dias).
 */

const LOGS_USER_PREFIX  = "logs:user:";
const LOGS_QUEUE_KEY    = "logs:pending:queue";
const MAX_RECENT_LOGS   = 100;
const BATCH_INTERVAL_MS = 10000; // 10 segundos

class ActionLogService {
  static isWorkerRunning = false;

  /**
   * Registra uma nova ação.
   * SÊNIOR: Não toca no disco. Apenas memória (Redis).
   */
  async log(userId, actionType, entityType = null, entityId = null, metadata = {}, isPublic = false, ipAddress = null) {
    try {
      // SÊNIOR: Resiliência — Se o Redis cair ou estiver subindo, aguardamos a prontidão
      if (!redisClient.client.isReady) {
        console.warn(`[actionLogService] ⏳ Redis não pronto. Aguardando para registrar log de ${actionType}...`);
        await redisClient.redisReadyPromise;
      }

      const logEntry = {
        userId,
        actionType,
        entityType,
        entityId,
        metadata: JSON.stringify(metadata),
        isPublic,
        ipAddress,
        createdAt: new Date().toISOString()
      };

      console.log(`[actionLogService] 📝 Registrando log: ${actionType} para User ${userId} (Público: ${isPublic})`);

      // Se for público, emitir para o feed global via Socket.IO
      if (isPublic) {
        const io = getIO();
        if (io) {
          io.emit("contract:log", {
            user_id: userId,
            action_type: actionType,
            metadata: metadata,
            created_at: logEntry.createdAt,
            message: metadata.public_message || ""
          });
        }
      }

      const userLogsKey = `${LOGS_USER_PREFIX}${userId}`;

      // 1. Camada UX: Salva no Redis para acesso instantâneo (100 últimos por usuário)
      const p = redisClient.pipeline();
      p.lPush(userLogsKey, JSON.stringify(logEntry));
      p.lTrim(userLogsKey, 0, MAX_RECENT_LOGS - 1);
      p.expire(userLogsKey, 86400); 
      
      // 2. Camada Persistência: Enfileira para descarte no Banco em Lote
      p.rPush(LOGS_QUEUE_KEY, JSON.stringify(logEntry));

      // SÊNIOR: Global Public Stream (Para Live Ticker e Contratos)
      // Mantém os últimos 50 logs públicos em memória para acesso instantâneo de 5k players
      if (isPublic) {
        const publicLogsKey = "cache:public_logs_stream";
        p.lPush(publicLogsKey, JSON.stringify(logEntry));
        p.lTrim(publicLogsKey, 0, 49); // Mantém os 50 mais recentes
        p.expire(publicLogsKey, 3600);
      }
      
      await p.exec();
    } catch (err) {
      console.error(`[actionLogService] ❌ Erro fatal ao registrar log: ${err.message}`);
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
        // SÊNIOR: Se o primeiro item for o marcador de vazio, retorna vazio sem bater no DB
        if (cached[0] === "EMPTY_MARKER") return [];

        return cached.map((raw, index) => {
          const parsed = JSON.parse(raw);
          return {
            id:          parsed.id || `${parsed.createdAt}-${parsed.actionType}-${index}`,
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

      // SÊNIOR: Se o banco retornou vazio, cacheamos o "vazio" no Redis por 5 minutos
      // para evitar que o poll de 30s do frontend acorde o Neon DB sem necessidade.
      if (result.rows.length === 0 && page === 1) {
        await redisClient.lPushAsync(userLogsKey, "EMPTY_MARKER");
        await redisClient.expireAsync(userLogsKey, 300); // 5 minutos de "silêncio" no banco
        return [];
      }

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
    if (ActionLogService.isWorkerRunning) return;
    ActionLogService.isWorkerRunning = true;

    console.log(`[actionLogService] 🚀 Worker de Logs Ativo (Capacidade: 500/lote a cada ${BATCH_INTERVAL_MS/1000}s).`);
    
    setInterval(async () => {
      try {
        const startTime = Date.now();
        // Aumentado para 500 por lote para aguentar escala massiva
        const logsRaw = await redisClient.lRangeAsync(LOGS_QUEUE_KEY, 0, 499); 
        if (!logsRaw || logsRaw.length === 0) return;

        const logs = logsRaw.map(r => JSON.parse(r));
        
        // SÊNIOR: Bulk Insert de Alta Performance
        const placeholders = logs.map((_, i) => 
          `($${i*7 + 1}, $${i*7 + 2}, $${i*7 + 3}, $${i*7 + 4}, $${i*7 + 5}, $${i*7 + 6}, $${i*7 + 7})`
        ).join(", ");

        const values = [];
        logs.forEach(l => {
          values.push(l.userId, l.actionType, l.entityType, l.entityId, l.metadata, l.isPublic || false, l.ipAddress);
        });

        await query(
          `INSERT INTO action_logs (user_id, action_type, entity_type, entity_id, metadata, is_public, ip_address)
           VALUES ${placeholders}`,
          values
        );

        // Remove apenas o que processamos
        await redisClient.lTrimAsync(LOGS_QUEUE_KEY, logs.length, -1);
        const duration = Date.now() - startTime;
        console.log(`[actionLogService] 💾 ${logs.length} logs persistidos no Postgres em ${duration}ms.`);
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
