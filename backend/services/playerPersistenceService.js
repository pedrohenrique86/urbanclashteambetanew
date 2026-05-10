/**
 * playerPersistenceService.js
 * 
 * SÊNIOR: Este serviço é responsável exclusivamente pelo motor de Write-Behind.
 * Ele gerencia a sincronização entre a memória (Redis) e o disco (PostgreSQL).
 */

const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const { 
  PLAYER_STATE_PREFIX, 
  DIRTY_PLAYERS_SET, 
  DB_PERSIST_FIELDS 
} = require("./playerStateConstants");

class PlayerPersistenceService {
  /**
   * Persistência Individual (Fallback ou Operação Crítica)
   */
  async persistPlayerState(userId) {
    if (!redisClient.client.isReady) return;

    const redisKey    = `${PLAYER_STATE_PREFIX}${userId}`;
    const playerState = await redisClient.hGetAllAsync(redisKey);

    if (!playerState || playerState.is_dirty !== "1") return;
    const loadedDirtyAt = playerState.is_dirty_at;

    try {
      const safeFields = Object.entries(playerState).filter(([k, v]) =>
        DB_PERSIST_FIELDS.has(k) && v !== undefined
      );

      if (safeFields.length === 0) {
        await this._clearDirtyFlag(userId, loadedDirtyAt);
        return;
      }

      const setClauses = safeFields.map(([k], i) => {
        const col = `"${k}"`;
        if (k === "status") return `${col} = $${i + 1}::player_status_type`;
        if (k.endsWith("_at")) return `${col} = $${i + 1}::timestamp`;
        if (k === "last_training_reset" || k === "last_ap_reset") return `${col} = $${i + 1}::date`;
        
        const isNumeric = [
          "level", "total_xp", "money", "energy", "action_points", 
          "victories", "defeats", "winning_streak", "daily_training_count",
          "attack", "defense", "focus", "instinct", "intimidation", "discipline",
          "critical_chance", "critical_damage", "toxicity",
          "faction_id", "premium_coins", "login_streak", "merit", "corruption"
        ].includes(k);

        if (isNumeric) return `${col} = $${i + 1}::numeric`;
        return `${col} = $${i + 1}`;
      });

      const values = safeFields.map(([k, v]) => {
        if (v === "" || v === "null" || v === null) return null;
        if (['attack', 'defense', 'focus', 'instinct'].includes(k)) {
          return Math.round(Number(v) * 100) / 100;
        }
        return v;
      });
      values.push(userId);

      await query(
        `UPDATE user_profiles
         SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $${safeFields.length + 1}::uuid`,
        values,
      );

      await this._clearDirtyFlag(userId, loadedDirtyAt);
      console.log(`[playerPersistence] ✅ ${userId} persistido individualmente.`);
    } catch (err) {
      console.error(`[playerPersistence] ❌ Erro ao persistir ${userId}:`, err.message);
    }
  }

  /**
   * Ciclo de Escrita em Lote (Bulk Update)
   */
  async persistDirtyStates() {
    if (!redisClient.client.isReady) return;

    try {
      const dirtyIds = await redisClient.sMembersAsync(DIRTY_PLAYERS_SET);
      if (dirtyIds && dirtyIds.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < dirtyIds.length; i += CHUNK_SIZE) {
          const chunk = dirtyIds.slice(i, i + CHUNK_SIZE);
          await this._bulkPersistChunk(chunk);
        }
      }
    } catch (err) {
      console.error(`[playerPersistence] ❌ Erro no ciclo de persistência:`, err.message);
    }
  }

  /**
   * Lógica interna de Bulk Update SQL
   */
  async _bulkPersistChunk(userIds) {
    if (!userIds || userIds.length === 0) return;

    const pipeline = redisClient.pipeline();
    userIds.forEach(uid => pipeline.hGetAll(`${PLAYER_STATE_PREFIX}${uid}`));
    const redisResults = await pipeline.exec();

    const toUpdate = [];
    const fields = Array.from(DB_PERSIST_FIELDS);

    redisResults.forEach((res, i) => {
      const raw = res;
      if (raw && raw.is_dirty === "1") {
        toUpdate.push({ uid: userIds[i], state: raw, loadedDirtyAt: raw.is_dirty_at });
      }
    });

    if (toUpdate.length === 0) return;

    try {
      const valuePlaceholders = [];
      const flatValues = [];
      
      toUpdate.forEach((item, rowIndex) => {
        const rowOffset = rowIndex * (fields.length + 1);
        const rowParams = [`$${rowOffset + 1}`]; // user_id
        flatValues.push(item.uid);

        fields.forEach((f, fIndex) => {
          rowParams.push(`$${rowOffset + fIndex + 2}`);
          let val = item.state[f];
          if (val === "" || val === "null" || val === null || val === undefined) {
            val = null;
          } else if (['attack', 'defense', 'focus', 'instinct'].includes(f)) {
            val = Math.round(Number(val) * 100) / 100;
          }
          flatValues.push(val);
        });
        valuePlaceholders.push(`(${rowParams.join(", ")})`);
      });

      const setClauses = fields.map(f => {
        if (f === "status") return `"${f}" = v."${f}"::player_status_type`;
        if (f.endsWith("_at")) return `"${f}" = v."${f}"::timestamp`;
        if (f === "last_training_reset" || f === "last_ap_reset") return `"${f}" = v."${f}"::date`;
        
        const isNumeric = [
          "level", "total_xp", "money", "energy", "action_points", 
          "victories", "defeats", "winning_streak", "daily_training_count",
          "attack", "defense", "focus", "instinct", "intimidation", "discipline",
          "critical_chance", "critical_damage", "toxicity",
          "faction_id", "premium_coins", "login_streak", "merit", "corruption"
        ].includes(f);

        if (isNumeric) return `"${f}" = v."${f}"::numeric`;
        return `"${f}" = v."${f}"`;
      });
      
      const columnNames = fields.map(f => `"${f}"`).join(", ");
      const sql = `
        UPDATE user_profiles AS p
        SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
        FROM (VALUES ${valuePlaceholders.join(", ")}) AS v(user_id, ${columnNames})
        WHERE p.user_id = v.user_id::uuid
      `;

      await query(sql, flatValues);

      // Limpeza das flags de sujo
      for (const item of toUpdate) {
        await this._clearDirtyFlag(item.uid, item.loadedDirtyAt);
      }

      console.log(`[playerPersistence] 💾 Lote de ${toUpdate.length} jogadores persistido com sucesso.`);
    } catch (dbErr) {
      console.error(`[playerPersistence] ❌ ERRO NO LOTE:`, dbErr.message);
      // Fallback: Tentativa individual
      for (const item of toUpdate) {
        await this.persistPlayerState(item.uid);
      }
    }
  }

  async _clearDirtyFlag(userId, loadedDirtyAt) {
    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
    const currentState = await redisClient.hGetAsync(redisKey, "is_dirty_at");
    if (currentState === loadedDirtyAt) {
      const p = redisClient.pipeline();
      p.hSet(redisKey, "is_dirty", "0");
      p.hSet(redisKey, "is_dirty_at", "");
      p.sRem(DIRTY_PLAYERS_SET, String(userId));
      await p.exec();
    }
  }
}

module.exports = new PlayerPersistenceService();
