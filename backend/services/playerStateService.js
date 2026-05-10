/**
 * playerStateService.js
 * 
 * SÊNIOR: Este serviço é a Fachada Principal para o estado do jogador.
 * Focado em performance máxima usando Redis (SSOT) e SSE.
 * Orquestra a persistência via PlayerPersistenceService (Write-Behind).
 */

const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const sseService = require("./sseService");
const persistenceService = require("./playerPersistenceService");
const { 
  PLAYER_STATE_PREFIX, 
  DIRTY_PLAYERS_SET, 
  PERSISTENCE_INTERVAL,
  VOLATILE_FIELDS,
  FIELD_TO_SSE,
  NUMERIC_FIELDS
} = require("./playerStateConstants");

class PlayerStateService {
  constructor() {
    this.schedulePersistence();
  }

  /**
   * Inicia o ciclo de vida da persistência assíncrona.
   */
  schedulePersistence() {
    setInterval(() => {
      persistenceService.persistDirtyStates();
    }, PERSISTENCE_INTERVAL);
  }

  /**
   * Obtém o estado completo do jogador.
   * Prioridade 1: Redis (Cache/RAM)
   * Prioridade 2: PostgreSQL (Disco) + Hidratação no Redis
   */
  async getPlayerState(userId) {
    if (!redisClient.client.isReady) {
      const res = await query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
      return res.rows[0];
    }

    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
    let state = await redisClient.hGetAllAsync(redisKey);

    if (!state || Object.keys(state).length === 0) {
      const dbRes = await query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
      if (dbRes.rows.length === 0) return null;

      state = dbRes.rows[0];
      await this._hydrateRedis(userId, state);
    }

    return this._parseState(state);
  }

  /**
   * Atualiza o estado do jogador de forma atômica no Redis.
   * Marca o jogador como "Dirty" para persistência futura no PostgreSQL.
   */
  async updatePlayerState(userId, updates) {
    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
    const p = redisClient.pipeline();

    const patchSSE = {};
    const hasUpdates = Object.keys(updates).length > 0;

    for (const [key, val] of Object.entries(updates)) {
      let finalVal = val;
      
      // SÊNIOR: Incremento relativo ou valor absoluto?
      if (typeof val === 'number' && NUMERIC_FIELDS.has(key)) {
        p.hIncrByFloat(redisKey, key, val);
      } else {
        finalVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : String(val);
        p.hSet(redisKey, key, finalVal);
      }

      // Prepara o patch para o Frontend (SSE)
      if (FIELD_TO_SSE[key]) {
        patchSSE[FIELD_TO_SSE[key]] = val;
      }
    }

    if (hasUpdates) {
      p.hSet(redisKey, "is_dirty", "1");
      p.hSet(redisKey, "is_dirty_at", Date.now().toString());
      p.sAdd(DIRTY_PLAYERS_SET, String(userId));
    }

    await p.exec();

    // Notifica o Frontend via SSE se houver mudanças visíveis
    if (Object.keys(patchSSE).length > 0) {
      sseService.broadcastToUser(userId, "player:update", patchSSE);
    }

    return this.getPlayerState(userId);
  }

  /**
   * Converte strings do Redis para tipos nativos (Números, Booleanos).
   */
  _parseState(state) {
    const out = { ...state };
    for (const field in out) {
      if (NUMERIC_FIELDS.has(field)) {
        let n = Number(out[field]);
        if (!isNaN(n)) {
          if (['attack', 'defense', 'focus', 'instinct'].includes(field)) {
            n = Math.round(n * 100) / 100;
          }
          out[field] = n;
        }
      }
    }
    // Booleano Especial
    out.is_admin = out.is_admin === "1" || out.is_admin === "true";
    return out;
  }

  /**
   * Alimenta o Redis com dados frescos do PostgreSQL.
   */
  async _hydrateRedis(userId, dbData) {
    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
    const p = redisClient.pipeline();

    for (const [key, val] of Object.entries(dbData)) {
      if (val !== null && val !== undefined) {
        const strVal = (typeof val === 'object') ? JSON.stringify(val) : String(val);
        p.hSet(redisKey, key, strVal);
      }
    }

    p.hSet(redisKey, "is_dirty", "0");
    p.hSet(redisKey, "is_dirty_at", "");
    p.expire(redisKey, 86400 * 7); // Cache por 7 dias se inativo
    await p.exec();
  }

  /**
   * Força a persistência imediata (Ex: Logout ou Compra Crítica).
   */
  async forcePersist(userId) {
    return persistenceService.persistPlayerState(userId);
  }
}

module.exports = new PlayerStateService();