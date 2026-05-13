/**
 * combatRadarService.js
 * 
 * SÊNIOR: Responsável pela detecção de alvos e geração de NPCs.
 * Especializado em busca rápida no Redis ZSET e filtragem de facção.
 */

const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const { 
  RENEGADO_BOT_NAMES, 
  GUARDIAO_BOT_NAMES,
  COMBAT_CONFIG 
} = require("./combatConstants");

class CombatRadarService {
  /**
   * Gera uma lista de alvos (Jogadores Online + BOTs)
   */
  async getRadarTargets(userId) {
    const CACHE_KEY = `radar_lock:${userId}`;
    const cached = await redisClient.getAsync(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const gameLogic = require("../utils/gameLogic");
    const attacker = await playerStateService.getPlayerState(userId);
    if (!attacker) throw new Error("Invasor não detectado na rede.");
    
    // SÊNIOR: O radar deve operar sobre o Nível Dinâmico (Prestígio)
    const attackerLevel = gameLogic.calculateDynamicLevel(attacker);
    const myFaction = (attacker.faction || "").toLowerCase().trim();
    
    // Determina a facção inimiga
    const enemyFactionKey = myFaction.includes('guard') ? 'gangsters' : 'guardas';
    const ENEMY_SET_KEY = `online_players_set:${enemyFactionKey}`;

    // SÊNIOR: Estrutura do Radar Refatorada
    // 3 Slots para PvP (Jogadores Reais ou Elite Bots de fallback)
    // 3 Slots para PvE (Bots Comuns)
    let pvpTargets = [];
    let pveTargets = [];

    // 1. Busca Jogadores Reais Online (PvP)
    try {
      const rawIds = await redisClient.sRandMemberAsync(ENEMY_SET_KEY, 10);
      if (rawIds) {
        const ids = Array.isArray(rawIds) ? rawIds : [rawIds];
        const pipeline = redisClient.pipeline();
        ids.forEach(id => pipeline.hGetAll(`${playerStateService.PLAYER_STATE_PREFIX}${id}`));
        const results = await pipeline.exec();

        results.forEach((raw) => {
          if (!raw || Object.keys(raw).length === 0) return;
          const target = playerStateService._parseState(raw);
          const tLevel = gameLogic.calculateDynamicLevel(target);

          if (target.user_id !== userId && tLevel >= (attackerLevel - 3) && tLevel <= (attackerLevel + 3)) {
            if (pvpTargets.length < 3) {
              pvpTargets.push({
                id: target.user_id,
                level: tLevel,
                faction: target.faction,
                name: this._censorName(target.display_name || target.username),
                online: true,
                is_npc: false,
                status: target.status
              });
            }
          }
        });
      }
    } catch (e) {
      console.error("[Radar] Erro ao buscar players reais:", e.message);
    }

    // 2. Fallback PvP: Se não houver jogadores suficientes, preenchemos com BOTS ELITE
    const usedNames = new Set(pvpTargets.map(t => t.name));
    while (pvpTargets.length < 3) {
      const npcId = `npc_elite_${Math.random().toString(36).substr(2, 5)}`;
      const npc = this.generateNpcData(npcId, attacker);
      if (!usedNames.has(npc.username)) {
        usedNames.add(npc.username);
        pvpTargets.push({
          id: npcId,
          level: npc.level,
          faction: npc.faction,
          name: npc.username,
          online: true,
          is_npc: true,
          is_elite: true
        });
      }
    }

    // 3. Preenchimento PvE: Bots Comuns
    while (pveTargets.length < 3) {
      const npcId = `npc_bot_${Math.random().toString(36).substr(2, 5)}`;
      const npc = this.generateNpcData(npcId, attacker);
      if (!usedNames.has(npc.username)) {
        usedNames.add(npc.username);
        pveTargets.push({
          id: npcId,
          level: npc.level,
          faction: npc.faction,
          name: npc.username,
          online: true,
          is_npc: true,
          is_elite: false
        });
      }
    }

    targets = [...pvpTargets, ...pveTargets];

    // 3. Busca Limites de Combate
    const [pvp, pve, resetAt] = await Promise.all([
      redisClient.getAsync(`combat:count:pvp:${userId}`),
      redisClient.getAsync(`combat:count:pve:${userId}`),
      redisClient.getAsync(`combat:reset_at:${userId}`)
    ]);

    const response = {
      targets: targets.slice(0, 6),
      limits: {
        pvp: parseInt(pvp || 0),
        pve: parseInt(pve || 0),
        reset_at: resetAt ? parseInt(resetAt) : null
      }
    };

    await redisClient.setAsync(CACHE_KEY, JSON.stringify(response), "EX", COMBAT_CONFIG.RADAR_TTL);
    return response;
  }

  /**
   * Gerador Determinístico de NPCs
   */
  generateNpcData(npcId, attacker) {
    const isRare = npcId.includes("_rare") || Math.random() < 0.05;
    const seed = npcId.split("_")[1];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
    
    const myFaction = (attacker.faction || "").toLowerCase();
    const botFaction = myFaction.includes('guard') ? "Renegados" : "Guardiões";
    const pool = botFaction === "Renegados" ? RENEGADO_BOT_NAMES : GUARDIAO_BOT_NAMES;
    
    const gameLogic = require("../utils/gameLogic");
    const attackerLevel = gameLogic.calculateDynamicLevel(attacker);
    const level = Math.max(1, attackerLevel + (Math.abs(hash % 5) - 2));

    return {
      username: `[BOT] ${pool[Math.abs(hash) % pool.length]}`,
      level,
      faction: botFaction,
      is_rare: isRare,
      // Atributos baseados no nível do BOT
      attack: level * 10,
      defense: level * 10,
      focus: level * 8,
      instinct: level * 5
    };
  }

  _censorName(name) {
    if (!name) return "****";
    if (name.length <= 2) return name.charAt(0) + "***";
    return name.charAt(0) + "*****" + name.charAt(name.length - 1);
  }
}

module.exports = new CombatRadarService();
