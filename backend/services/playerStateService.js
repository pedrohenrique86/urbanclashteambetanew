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
  RANKING_ALL,
  RANKING_RENEGADOS,
  RANKING_GUARDIOES,
  PERSISTENCE_INTERVAL,
  VOLATILE_FIELDS,
  FIELD_TO_SSE,
  NUMERIC_FIELDS
} = require("./playerStateConstants");

class PlayerStateService {
  constructor() {
    this.schedulePersistence();
    this.startGarbageCollector();
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
   * SÊNIOR: Garbage Collector (Zelador de Memória)
   * Roda a cada 1 hora para limpar jogadores inativos há mais de 24h.
   * Crucial para servidores com 1GB de RAM.
   */
  startGarbageCollector() {
    setInterval(async () => {
      try {
        if (!redisClient.client.isReady) return;
        console.log("🧹 [GC] Iniciando limpeza de memória (Garbage Collector)...");

        // Buscamos todas as chaves de estado de jogador
        const keys = await redisClient.client.keys(`${PLAYER_STATE_PREFIX}*`);
        let cleaned = 0;

        for (const key of keys) {
          const state = await redisClient.hGetAllAsync(key);
          
          // Se não estiver 'dirty' (pendente de salvar) e for antigo, removemos
          const isDirty = state.is_dirty === "1";
          const lastUpdate = Number(state.is_dirty_at || 0);
          const now = Date.now();

          // Se o jogador está inativo há mais de 24 horas e os dados estão salvos no SQL
          if (!isDirty && (now - lastUpdate > 86400000)) {
            await redisClient.delAsync(key);
            cleaned++;
          }
        }

        if (cleaned > 0) {
          console.log(`✅ [GC] Limpeza concluída: ${cleaned} perfis inativos removidos da RAM.`);
        }
      } catch (err) {
        console.error("❌ [GC] Erro no Garbage Collector:", err.message);
      }
    }, 3600000); // Roda a cada 1 hora
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

    // SÊNIOR: Lazy Evaluation da Energia
    // Se o jogador ficou offline, recuperamos a energia baseada no tempo decorrido
    return this.regenEnergyForPlayer(userId, this._parseState(state));
  }

  /**
   * Calcula e aplica a regeneração de energia baseada no tempo.
   * Pode ser chamado pelo Heartbeat (Online) ou via Lazy Eval (Request).
   */
  async regenEnergyForPlayer(userId, currentState = null) {
    const state = currentState || await this.getPlayerState(userId);
    if (!state) return null;

    const energy = Number(state.energy || 0);
    const maxEnergy = Number(state.max_energy || 100);
    
    if (energy >= maxEnergy) return state;

    const now = Date.now();
    const lastUpdate = Number(state.last_energy_update || now);
    const gameLogic = require("../utils/gameLogic");
    const regenRateMinutes = (gameLogic.ENERGY && gameLogic.ENERGY.REGEN_RATE_MINUTES) ? gameLogic.ENERGY.REGEN_RATE_MINUTES : 3;
    const msPerPoint = regenRateMinutes * 60 * 1000;

    const elapsed = now - lastUpdate;
    const pointsToRegen = Math.floor(elapsed / msPerPoint);

    if (pointsToRegen > 0) {
      const newEnergy = Math.min(maxEnergy, energy + pointsToRegen);
      const leftoverMs = elapsed % msPerPoint;
      const newLastUpdate = now - leftoverMs;

      await this.updatePlayerState(userId, {
        energy: newEnergy - energy, // Usamos o incremento relativo para ser atômico
        last_energy_update: newLastUpdate.toString()
      });

      // Retorna o estado atualizado
      return { ...state, energy: newEnergy, last_energy_update: newLastUpdate };
    }

    return state;
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

    // SÊNIOR: Se mudou XP ou Nível, atualiza o Ranking ZSET em tempo real
    if (updates.total_xp !== undefined || updates.level !== undefined) {
      this.getPlayerState(userId).then(state => this._updateRankingScore(userId, state));
    }

    return this.getPlayerState(userId);
  }

  /**
   * Mantém os ZSETs de ranking (Global e Facção) sincronizados.
   */
  async _updateRankingScore(userId, state) {
    if (!state || !redisClient.client.isReady) return;

    // SÊNIOR: Validação rigorosa para evitar erro de 'undefined' no Redis v4
    const levelVal = Number(state.level || 0);
    const xpVal = Number(state.total_xp || 0);
    const score = (levelVal * 100000000) + xpVal;

    if (isNaN(score) || !userId) {
      console.warn(`[RankingUpdate] ⚠️ Dados inválidos para ranking: uid=${userId}, score=${score}`);
      return;
    }

    const p = redisClient.pipeline();
    const member = { score, value: String(userId) };

    p.zAdd(RANKING_ALL, [member]);
    
    if (state.faction === "renegados") {
      p.zAdd(RANKING_RENEGADOS, [member]);
      p.zRem(RANKING_GUARDIOES, String(userId));
    } else if (state.faction === "guardioes") {
      p.zAdd(RANKING_GUARDIOES, [member]);
      p.zRem(RANKING_RENEGADOS, String(userId));
    }

    await p.exec();
  }

  /**
   * Converte strings do Redis para tipos nativos (Números, Booleanos).
   */
  _parseState(state) {
    const out = { ...state };
    for (const field in out) {
      if (NUMERIC_FIELDS.has(field)) {
        let n = Number(out[field] || 0); // SÊNIOR: Default 0 evita crash no toLocaleString() do frontend
        if (!isNaN(n)) {
          if (['attack', 'defense', 'focus', 'instinct'].includes(field)) {
            n = Math.round(n * 100) / 100;
          }
          out[field] = n;
        } else {
          out[field] = 0;
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

    // SÊNIOR: Garante que o ranking ZSET esteja populado se o jogador carregar do DB
    await this._updateRankingScore(userId, this._parseState(dbData));
  }

  /**
   * Força a persistência imediata (Ex: Logout ou Compra Crítica).
   */
  async forcePersist(userId) {
    return persistenceService.persistPlayerState(userId);
  }

  /**
   * SÊNIOR: Gera um "Instantâneo de Combate" com todos os bônus aplicados.
   * Evita recálculos caros durante os turnos da luta.
   */
  async getCombatSnapshot(userId) {
    const state = await this.getPlayerState(userId);
    if (!state) return null;

    const gameLogic = require("../utils/gameLogic");
    const inventoryService = require("./inventoryService");

    // SÊNIOR: Busca bônus de chips equipados (via inventário/redis)
    const chips = await inventoryService.getEquippedItems(userId);
    const powerData = gameLogic.calculateTotalPower(state, chips);

    return {
      userId,
      username: state.display_name || state.username,
      level: state.level,
      faction: state.faction,
      hp: 100, // Vida base para início de combate
      maxHp: 100,
      stagger: 100,
      // Atributos Finais (Já com bônus)
      attack: powerData.finalAtk,
      defense: powerData.finalDef,
      focus: powerData.finalFoc,
      instinct: powerData.finalIns,
      powerSolo: powerData.powerSolo,
      // Probabilidades
      critChance: gameLogic.calcCritChance(state),
      critMult: gameLogic.calcCritDamageMultiplier(state),
      money: state.money,
      status: state.status
    };
  }

  /**
   * SÊNIOR: Recalcula os bônus de equipamento e atualiza o estado do jogador.
   * Chamado pelo inventoryService após equipar/desequipar.
   */
  async refreshEquipmentBonuses(userId) {
    const snapshot = await this.getCombatSnapshot(userId);
    if (!snapshot) return;

    // SÊNIOR: Atualiza o poder solo e bônus no Redis para que outros serviços vejam
    await this.updatePlayerState(userId, {
        attack: snapshot.attack,
        defense: snapshot.defense,
        focus: snapshot.focus,
        instinct: snapshot.instinct
    });

    console.log(`[PlayerState] 🛡️ Bônus de equipamentos atualizados para ${userId}`);
  }
}

module.exports = new PlayerStateService();