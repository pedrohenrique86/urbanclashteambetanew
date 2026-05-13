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

    // 1. Busca Limites de Combate para aplicar regras de radar
    const [pvpStr, pveStr, resetAt] = await Promise.all([
      redisClient.getAsync(`combat:count:pvp:${userId}`),
      redisClient.getAsync(`combat:count:pve:${userId}`),
      redisClient.getAsync(`combat:reset_at:${userId}`)
    ]);
    const pvp = parseInt(pvpStr || 0);
    const pve = parseInt(pveStr || 0);

    // SÊNIOR: Estrutura do Radar Refatorada
    // 3 Slots para PvP (Jogadores Reais ou Elite Bots de fallback)
    // 3 Slots para PvE (Bots Comuns)
    let pvpTargets = [];
    let pveTargets = [];

    // 2. Busca Jogadores Reais Online (PvP)
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
            if (pvpTargets.length < 6) {
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

    // 3. Fallback PvP: Se não houver jogadores suficientes, preenchemos com BOTS ELITE
    // REGRA DE NEGÓCIO: O jogador precisa primeiro completar os 10 PvE diários (pve >= 10).
    // Só depois disso os Bots Elite aparecem para preencher as vagas (se não houver humanos).
    const usedNames = new Set(pvpTargets.map(t => t.name));
    
    // Se pve >= 10, o radar inteiro (até 6 vagas) vira PvP/Elite.
    if (pve >= 10) {
      while (pvpTargets.length < 6) {
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
    }

    // 4. Preenchimento PvE: Bots Comuns (Só se ainda não completou os 10)
    // Preenche as vagas restantes até garantirmos 6 alvos visíveis
    if (pve < 10) {
      while ((pvpTargets.length + pveTargets.length) < 6) {
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
    }

    const targets = [...pvpTargets, ...pveTargets];

    const response = {
      targets: targets.slice(0, 6),
      limits: {
        pvp,
        pve,
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
    // SÊNIOR: Fix para o infinite loop. 
    // npcId é "npc_elite_12345" ou "npc_bot_12345". O hash deve usar a parte aleatória (index 2).
    const seed = npcId.split("_")[2] || npcId; 
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
    
    const myFaction = (attacker.faction || "").toLowerCase();
    const botFaction = myFaction.includes('guard') ? "Renegados" : "Guardiões";
    const pool = botFaction === "Renegados" ? RENEGADO_BOT_NAMES : GUARDIAO_BOT_NAMES;
    
    const gameLogic = require("../utils/gameLogic");
    const attackerLevel = gameLogic.calculateDynamicLevel(attacker);
    const level = Math.max(1, attackerLevel + (Math.abs(hash % 5) - 2));

    // Se o pool for pequeno ou indefinido, usamos um nome genérico com o seed para garantir unicidade
    const baseName = (pool && pool.length > 0) ? pool[Math.abs(hash) % pool.length] : `Spectro-${seed}`;

    return {
      username: `[BOT] ${baseName} ${seed.substring(0, 2).toUpperCase()}`, // Garante unicidade
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
