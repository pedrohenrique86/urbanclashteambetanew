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

const FACTION_ALIAS_MAP = {
  gangsters:  "renegados",
  gangster:   "renegados",
  renegados:  "renegados",
  renegado:   "renegados",
  guardas:    "guardioes",
  guarda:     "guardioes",
  guardioes:  "guardioes",
  guardiao:   "guardioes",
  "guardiões": "guardioes",
  "guardião":  "guardioes",
};

class PlayerStateService {
  constructor() {
    this.schedulePersistence();
    this.startGarbageCollector();
    this.trainingTimers = new Map();
  }

  /**
   * SÊNIOR: Resolve o nome canônico da facção.
   */
  resolveFactionName(input) {
    if (!input) return "renegados";
    return FACTION_ALIAS_MAP[String(input).toLowerCase().trim()] || "renegados";
  }

  /**
   * SÊNIOR: Formata os dados brutos para o padrão esperado pelo Frontend.
   * Centraliza cálculos de XP, Bônus de Status e Normalização de tipos.
   */
  formatProfile(profile) {
    if (!profile) return null;
    const gameLogic = require("../utils/gameLogic");

    const total_xp = parseInt(profile.total_xp || 0, 10);
    const xpLevelPure = gameLogic.calculateLevelFromXp(total_xp);
    const level = xpLevelPure;
    const xpStatus = gameLogic.deriveXpStatus(total_xp, xpLevelPure);

    const isRuptura = profile.status === 'Ruptura';
    const statusMult = isRuptura ? 0.8 : 1;

    return {
      ...profile,
      id: profile.user_id || profile.id,
      username: profile.display_name || profile.username,
      display_name: profile.display_name || profile.username,
      is_admin: profile.is_admin === "1" || profile.is_admin === true || profile.is_admin === "true",
      attack: (parseFloat(profile.attack) || 0) * statusMult,
      defense: (parseFloat(profile.defense) || 0) * statusMult,
      focus: (parseFloat(profile.focus) || 0) * statusMult,
      instinct: (parseFloat(profile.instinct) || 0) * statusMult,
      level,
      total_xp,
      current_xp: xpStatus.currentXp,
      xp_required: xpStatus.xpRequired,
      energy: parseInt(profile.energy, 10) || 0,
      money: parseInt(profile.money, 10) || 0,
      action_points: parseInt(profile.action_points, 10) || 0,
      victories: parseInt(profile.victories, 10) || 0,
      defeats: parseInt(profile.defeats, 10) || 0,
      winning_streak: parseInt(profile.winning_streak, 10) || 0,
      ucrypto: parseInt(profile.premium_coins || profile.ucrypto || 0, 10),
      crit_chance_pct: gameLogic.calcCritChance(profile),
      crit_damage_mult: gameLogic.calcCritDamageMultiplier(profile),
      energy_updated_at: profile.energy_updated_at || Date.now().toString(),
    };
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
        const keys = await redisClient.keysAsync(`${PLAYER_STATE_PREFIX}*`);
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
   * Prioridade 2: Banco de Dados (Disco) + Hidratação no Redis
   */
  async getPlayerState(userId) {
    if (!redisClient.client.isReady) {
      const res = await query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
      return res.rows[0];
    }

    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
    let state = await redisClient.hGetAllAsync(redisKey);

    if (!state || Object.keys(state).length === 0) {
      const dbRes = await query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
      if (dbRes.rows.length === 0) return null;

      state = dbRes.rows[0];
      await this._hydrateRedis(userId, state);
    }

    // SÊNIOR: Lazy Evaluation da Energia e Treinamento
    // Se o jogador ficou offline, recuperamos a energia e checamos se o treino acabou
    const parsed = this._parseState(state);
    const withEnergy = await this.regenEnergyForPlayer(userId, parsed);
    return this.checkTrainingCompletion(userId, withEnergy);
  }

  /**
   * SÊNIOR: Verifica se um treinamento expirou e resolve o status do jogador.
   * Garante que o usuário receba o toast de conclusão ao logar ou atualizar o perfil.
   */
  async checkTrainingCompletion(userId, state) {
    if (!state.active_training_type || !state.training_ends_at) return state;

    const endsAt = new Date(state.training_ends_at).getTime();
    if (endsAt <= Date.now() && state.status === "Aprimoramento") {
       try {
         // SÊNIOR: Importação dinâmica para evitar circular dependency
         const trainingService = require("./trainingService");
         const result = await trainingService.completeTraining(userId);
         
         const toast = {
           title: "TREINAMENTO_CONCLUÍDO",
           message: `Sua sessão de aprimoramento foi finalizada e os ganhos integrados automaticamente.`,
           type: "success"
         };

         const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
         await redisClient.client.hSet(redisKey, "pending_training_toast", JSON.stringify(toast));

         // Notifica via SSE que o perfil mudou drasticamente (ganhos + status)
         sseService.broadcastToUser(userId, "player:patch", { 
           type: "player:patch",
           patch: { ...result.player, pending_training_toast: toast },
           version: Date.now() 
         });

         return { ...state, ...result.player, pending_training_toast: JSON.stringify(toast) };
       } catch (err) {
         console.error(`[playerState] Erro na auto-finalização do treino: ${err.message}`);
       }
    }
    return state;
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
    
    if (energy >= maxEnergy) {
      if (energy > maxEnergy) {
        // SÊNIOR: Se o valor no Redis passou do teto (bug anterior), resetamos para o máximo
        const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
        await redisClient.client.hSet(redisKey, "energy", maxEnergy.toString());
        return { ...state, energy: maxEnergy };
      }
      return state;
    }

    const now = Date.now();
    const lastUpdate = Number(state.energy_updated_at || now);
    const gameLogic = require("../utils/gameLogic");
    const regenRateMinutes = (gameLogic.ENERGY && gameLogic.ENERGY.REGEN_RATE_MINUTES) ? gameLogic.ENERGY.REGEN_RATE_MINUTES : 3;
    const msPerPoint = regenRateMinutes * 60 * 1000;

    const elapsed = now - lastUpdate;
    const pointsToRegen = Math.floor(elapsed / msPerPoint);

    if (pointsToRegen > 0) {
      const newEnergy = Math.min(maxEnergy, energy + pointsToRegen);
      const leftoverMs = elapsed % msPerPoint;
      const newLastUpdate = now - leftoverMs;

      // SÊNIOR: Atualização atômica no Redis. 
      // Calculamos o incremento real necessário para atingir o novo valor (capado)
      const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;
      const actualIncrement = newEnergy - energy;

      if (actualIncrement > 0) {
        await redisClient.client.hIncrBy(redisKey, "energy", actualIncrement);
      }
      
      await redisClient.client.hSet(redisKey, "energy_updated_at", newLastUpdate.toString());
      await redisClient.client.hSet(redisKey, "is_dirty", "1");
      await redisClient.client.sAdd(DIRTY_PLAYERS_SET, String(userId));

      // Notifica o frontend
      sseService.broadcastToUser(userId, "player:update", { 
        energy: newEnergy, 
        energy_updated_at: newLastUpdate.toString() 
      });

      return { ...state, energy: newEnergy, energy_updated_at: newLastUpdate };
    }

    return state;
  }

  /**
   * Atualiza o estado do jogador de forma atômica no Redis.
   * Marca o jogador como "Dirty" para persistência futura no Banco de Dados.
   */
  async updatePlayerState(userId, updates) {
    const redisKey = `${PLAYER_STATE_PREFIX}${userId}`;

    // SÊNIOR: Se mudou XP, calculamos se o nível base subiu para manter sincronia real-time
    if (updates.total_xp !== undefined) {
      const currentState = await this.getPlayerState(userId);
      const gameLogic = require("../utils/gameLogic");
      const currentXp = Number(currentState.total_xp || 0);
      const newTotalXp = currentXp + Number(updates.total_xp);
      const calculatedLevel = gameLogic.calculateLevelFromXp(newTotalXp);
      const storedLevel = Number(currentState.level || 1);
      
      if (calculatedLevel > storedLevel) {
        updates.level = calculatedLevel;
      }
    }

    const p = redisClient.pipeline();

    const patchSSE = {};
    const hasUpdates = Object.keys(updates).length > 0;

    for (const [key, val] of Object.entries(updates)) {
      let finalVal = val;
      
      // SÊNIOR: Incremento relativo ou valor absoluto?
      // O level e daily_training_count (quando resetado) devem ser absolutos.
      // O padrão para campos numéricos é INCREMENTO, exceto se especificado.
      const isAbsoluteField = ['level'].includes(key);

      if (typeof val === 'number' && NUMERIC_FIELDS.has(key) && !isAbsoluteField) {
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

    // SÊNIOR: Se mudou XP, Nível, Atributos ou Dinheiro, atualiza o Ranking ZSET em tempo real
    // Esses campos compõem o Nível Dinâmico (Prestígio) que é a base do ranking.
    const rankingFields = ['total_xp', 'level', 'attack', 'defense', 'focus', 'money'];
    const needsRankingUpdate = Object.keys(updates).some(k => rankingFields.includes(k));

    if (needsRankingUpdate) {
      this.getPlayerState(userId).then(state => this._updateRankingScore(userId, state));
    }

    return this.getPlayerState(userId);
  }

  /**
   * Mantém os ZSETs de ranking (Global e Facção) sincronizados.
   */
  async _updateRankingScore(userId, state) {
    if (!state || !redisClient.client.isReady) return;
    const gameLogic = require("../utils/gameLogic");

    // SÊNIOR: Validação rigorosa para evitar erro de 'undefined' no Redis v4
    // SÊNIOR: Nível Dinâmico (XP + Atributos + Dinheiro)
    const dynamicLevel = gameLogic.calculateDynamicLevel(state);
    const totalXp = Number(state.total_xp || 0);
    
    // SÊNIOR: Score unificado (Level.XP) para ordenação perfeita
    // O Level é a parte inteira, o XP é o critério de desempate (decimal).
    const score = dynamicLevel + (totalXp / 1000000000);

    if (isNaN(score) || !userId) {
      console.warn(`[RankingUpdate] ⚠️ Dados inválidos para ranking: uid=${userId}, score=${score}`);
      return;
    }

    const p = redisClient.pipeline();
    const member = { score, value: String(userId) };

    p.zAdd(RANKING_ALL, [member]);
    
    const resolved = this.resolveFactionName(state.faction);
    if (resolved === "renegados") {
      p.zAdd(RANKING_RENEGADOS, [member]);
      p.zRem(RANKING_GUARDIOES, String(userId));
    } else if (resolved === "guardioes") {
      p.zAdd(RANKING_GUARDIOES, [member]);
      p.zRem(RANKING_RENEGADOS, String(userId));
    }

    await p.exec();

    // SÊNIOR: Broadcast para o canal de ranking se o jogador estiver no Top 100
    // Isso permite que o ranking na tela atualize sem refresh manual.
    const rank = await redisClient.zRevRankAsync(RANKING_ALL, String(userId));
    if (rank !== null && rank < 100) {
      sseService.publish("ranking", "ranking:update", { 
        userId, 
        rank: rank + 1,
        level: dynamicLevel,
        total_xp: totalXp
      });
    }
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
   * Alimenta o Redis com dados frescos do Banco de Dados.
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
   * Evita recálculos caros durante os turnos da luta usando cache no Redis (5 min).
   */
  async getCombatSnapshot(userId) {
    const cacheKey = `combat:snapshot:${userId}`;
    
    // Tenta pegar do cache (O(1))
    const cached = await redisClient.getAsync(cacheKey);
    if (cached) return JSON.parse(cached);

    const state = await this.getPlayerState(userId);
    if (!state) return null;

    const gameLogic = require("../utils/gameLogic");
    const inventoryService = require("./inventoryService");

    // Busca bônus de chips equipados
    const chips = await inventoryService.getEquippedItems(userId);
    const powerData = gameLogic.calculateTotalPower(state, chips);

    const snapshot = {
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

    // Salva no cache por 5 minutos
    await redisClient.setAsync(cacheKey, JSON.stringify(snapshot), "EX", 300);

    return snapshot;
  }

  /**
   * SÊNIOR: Recalcula os bônus de equipamento e atualiza o estado do jogador.
   * Chamado pelo inventoryService após equipar/desequipar.
   */
  async refreshEquipmentBonuses(userId) {
    // SÊNIOR: Invalida o snapshot de combate antigo para forçar novo cálculo
    await redisClient.delAsync(`combat:snapshot:${userId}`);

    const snapshot = await this.getCombatSnapshot(userId);
    if (!snapshot) return;

    // Atualiza bônus no Redis principal
    await this.updatePlayerState(userId, {
        attack: snapshot.attack,
        defense: snapshot.defense,
        focus: snapshot.focus,
        instinct: snapshot.instinct
    });

    console.log(`[PlayerState] 🛡️ Bônus de equipamentos atualizados para ${userId}`);
  }

  /**
   * SÊNIOR: Busca múltiplos estados de jogadores em uma única operação (Batching).
   * Fundamental para renderizar listas de membros, amigos ou rankings.
   */
  async getManyPlayerStates(userIds) {
    if (!userIds || userIds.length === 0) return [];
    if (!redisClient.client.isReady) {
      const { rows } = await query(
        `SELECT * FROM user_profiles WHERE user_id IN (${userIds.map(() => `?`).join(',')})`,
        userIds
      );
      return rows;
    }

    // SÊNIOR: Pipeline para buscar todos os hashes em uma única viagem ao Redis
    const pipeline = redisClient.pipeline();
    userIds.forEach(id => pipeline.hGetAll(`${PLAYER_STATE_PREFIX}${id}`));
    const results = await pipeline.exec();

    const hydrated = [];
    const missingIds = [];

    results.forEach((raw, i) => {
      if (raw && Object.keys(raw).length > 0) {
        hydrated.push(this._parseState(raw));
      } else {
        missingIds.push(userIds[i]);
      }
    });

    // Se algum jogador não estiver no cache, buscamos no DB (Hydration cirúrgica)
    if (missingIds.length > 0) {
      const dbRes = await query(
        `SELECT * FROM user_profiles WHERE user_id IN (${missingIds.map(() => `?`).join(',')})`,
        missingIds
      );
      
      for (const row of dbRes.rows) {
        await this._hydrateRedis(row.user_id, row);
        hydrated.push(row);
      }
    }

    return hydrated;
  }

  /**
   * SÊNIOR: Agenda o fim de um treinamento para notificação via SSE.
   * Gerencia o timer em memória para avisar o player assim que o tempo acaba.
   */
  scheduleTraining(userId, endsAtMs) {
    this.cancelScheduledTraining(userId);
    
    const delay = endsAtMs - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(async () => {
      try {
        const state = await this.getPlayerState(userId);
        if (state && state.status === "Aprimoramento") {
          // Resolve o status e gera o toast via checkTrainingCompletion
          await this.checkTrainingCompletion(userId, state);
          
          sseService.broadcastToUser(userId, "training:completed", { 
            message: "Módulo de Aprimoramento Concluído. Seus novos parâmetros estão prontos para integração." 
          });
        }
      } catch (err) {
        console.error(`[playerState] Erro ao auto-resolver treino online: ${err.message}`);
      } finally {
        this.trainingTimers.delete(userId);
      }
    }, delay + 500); // 500ms de margem de segurança

    this.trainingTimers.set(userId, timer);
  }

  /**
   * Cancela um timer de treinamento agendado.
   */
  cancelScheduledTraining(userId) {
    if (this.trainingTimers.has(userId)) {
      clearTimeout(this.trainingTimers.get(userId));
      this.trainingTimers.delete(userId);
    }
  }
}

module.exports = new PlayerStateService();