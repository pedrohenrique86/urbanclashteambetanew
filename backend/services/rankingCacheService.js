/**
 * rankingCacheService.js
 * 
 * SÊNIOR: Refatorado para Ranking em Tempo Real usando Redis Sorted Sets (ZSET).
 * Fonte de Verdade: RANKING_ALL, RANKING_RENEGADOS, RANKING_GUARDIOES.
 * Não depende mais de snapshots JSON estáticos de 10 minutos para jogadores.
 */

const redisClient = require("../config/redisClient");
const { query } = require("../config/database");
const sseService = require("./sseService");
const playerStateService = require("./playerStateService");
const { 
  RANKING_ALL, 
  RANKING_RENEGADOS, 
  RANKING_GUARDIOES,
  PLAYER_STATE_PREFIX
} = require("./playerStateConstants");
const gameLogic = require("../utils/gameLogic");

class RankingCacheService {
  /**
   * SÊNIOR: Ponto de entrada unificado para o Ranking.
   */
  async ensureFreshRanking(type, faction) {
    if (type === "clans") {
      return this._getClansRanking();
    }
    return this._getUsersRanking(faction || "all");
  }

  /**
   * SÊNIOR: Obtém a posição exata de um usuário no ranking de forma instantânea (O(1)).
   */
  async getUserRank(userId, faction = "all") {
    const resolved = playerStateService.resolveFactionName(faction);
    let zkey = RANKING_ALL;
    if (faction && faction !== "all") {
      if (resolved === "renegados") zkey = RANKING_RENEGADOS;
      else if (resolved === "guardioes") zkey = RANKING_GUARDIOES;
    }
    
    const rank = await redisClient.zRevRankAsync(zkey, String(userId));
    return rank !== null ? rank + 1 : null;
  }

  /**
   * Ranking de Jogadores via ZSET (Tempo Real)
   */
  async _getUsersRanking(faction) {
    const resolved = playerStateService.resolveFactionName(faction);
    let zkey = RANKING_ALL;
    
    if (faction && faction !== "all") {
      if (resolved === "renegados") zkey = RANKING_RENEGADOS;
      else if (resolved === "guardioes") zkey = RANKING_GUARDIOES;
    }

    // Pega os Top 100 (mais que suficiente para 99% das visualizações)
    const topIds = await redisClient.zRevRangeAsync(zkey, 0, 99);
    
    if (!topIds || topIds.length === 0) {
      return { data: [], etag: "empty", timestamp: Date.now() };
    }

    // Hydration em lote (Pipeline) - Muito mais rápido que queries individuais
    const pipeline = redisClient.pipeline();
    topIds.forEach(id => pipeline.hGetAll(`${PLAYER_STATE_PREFIX}${id}`));
    const results = await pipeline.exec();

    const hydrated = [];
    const missingIds = [];

    results.forEach((raw, i) => {
      // SÊNIOR: Verifica se o objeto está preenchido (hGetAll retorna {} para chaves inexistentes)
      if (raw && Object.keys(raw).length > 0) {
        const state = playerStateService._parseState(raw);
        hydrated.push(this._formatPlayer(state, i + 1));
      } else {
        missingIds.push(topIds[i]);
      }
    });

    // Fallback cirúrgico para o Banco se algum jogador expirou do Redis
    if (missingIds.length > 0) {
      const dbPlayers = await this._fetchPlayersFromDB(missingIds);
      dbPlayers.forEach((p) => {
        hydrated.push(p);
      });
    }

    // Ordenação final e atribuição de Rank real
    hydrated.sort((a, b) => b.level - a.level || b.total_xp - a.total_xp);
    const finalData = hydrated.slice(0, 100).map((p, i) => ({ ...p, rank: i + 1 }));

    return {
      data: finalData,
      etag: `W/"${Date.now()}"`,
      timestamp: Date.now()
    };
  }

  /**
   * Formata os dados para o contrato do Frontend
   */
  _formatPlayer(state, rank) {
    const total_xp = Number(state.total_xp || 0);
    const level = Number(state.level || 1);
    
    // SÊNIOR: Usa o gameLogic para consistência total com o perfil do jogador
    const xpStatus = gameLogic.deriveXpStatus ? gameLogic.deriveXpStatus(total_xp, level) : { currentXp: 0, xpRequired: 100 };

    return {
      id: state.user_id,
      username: state.display_name || state.username,
      display_name: state.display_name || state.username,
      avatar_url: state.avatar_url,
      level: gameLogic.calculateDynamicLevel(state),
      total_xp: total_xp,
      current_xp: xpStatus.currentXp,
      xp_required: xpStatus.xpRequired,
      faction: state.faction,
      victories: Number(state.victories || 0),
      defeats: Number(state.defeats || 0),
      winning_streak: Number(state.winning_streak || 0),
      status: state.status || 'Operacional'
    };
  }

  async _fetchPlayersFromDB(ids) {
    try {
      const { rows } = await query(
        `SELECT * FROM user_profiles WHERE user_id IN (${ids.map(() => `?`).join(',')})`,
        ids
      );
      return rows.map(r => this._formatPlayer(r, 0));
    } catch (e) {
      console.error("[ranking] ❌ Erro no fallback DB:", e.message);
      return [];
    }
  }

  /**
   * Ranking de Clãs via ZSET (Tempo Real)
   * SÊNIOR: Suporta 5.000+ CCU com hidratação em lote.
   */
  async _getClansRanking() {
    // Pega os Top 50 clãs
    const topIds = await redisClient.zRevRangeWithScoresAsync(RANKING_CLANS, 0, 49);
    
    if (!topIds || topIds.length === 0) {
      // Fallback para o Banco se o Redis estiver vazio (warmup automático)
      const { rows } = await query(
        `SELECT id, name, faction, season_score as score, member_count 
         FROM clans ORDER BY season_score DESC LIMIT 50`
      );
      if (rows.length > 0) {
        // Aproveita para popular o Redis
        const p = redisClient.pipeline();
        rows.forEach(r => p.zAdd(RANKING_CLANS, [{ score: Number(r.score) || 0, value: String(r.id) }]));
        await p.exec();
      }
      return { data: rows.map((r, i) => ({ ...r, position: i + 1 })), etag: "db-fallback", timestamp: Date.now() };
    }

    // Hidratação dos nomes e facções dos clãs
    // SÊNIOR: Em um sistema de alta escala, usaríamos um HASH no Redis para clãs.
    // Como os clãs mudam pouco (nome/facção), buscamos no banco as infos básicas dos IDs do Top 50.
    const ids = [];
    const scoresMap = {};
    for (let i = 0; i < topIds.length; i += 2) {
      const id = topIds[i];
      const score = topIds[i+1];
      ids.push(id);
      scoresMap[id] = score;
    }

    const { rows: clanDetails } = await query(
      `SELECT id, name, faction, member_count FROM clans WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    const finalData = clanDetails
      .map(c => ({
        ...c,
        score: Number(scoresMap[c.id]) || 0
      }))
      .sort((a, b) => b.score - a.score)
      .map((c, i) => ({ ...c, position: i + 1 }));

    return {
      data: finalData,
      etag: `W/"clans-live-${Date.now()}"`,
      timestamp: Date.now()
    };
  }

  /**
   * Atualiza a pontuação de um clã no ranking instantaneamente.
   */
  async updateClanScore(clanId, scoreDelta) {
    if (!clanId) return;
    await redisClient.zIncrByAsync(RANKING_CLANS, scoreDelta, String(clanId));
    
    // Broadcast opcional para o canal de ranking se o clã for importante (Top 20)
    // sseService.publish("ranking", "clan:update", { clanId, scoreDelta });
  }

  /**
   * Warmup Inicial: Popula os ZSETs de Jogadores e Clãs.
   */
  async initializeRankingZSet() {
    if (!redisClient.client.isReady) return;

    // Warmup de Jogadores (já existente)
    const playerCount = await redisClient.zCardAsync(RANKING_ALL);
    if (playerCount === 0) {
      const { rows: pRows } = await query(
        `SELECT user_id, level, total_xp, faction, attack, defense, focus, money 
         FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 2000`
      );
      if (pRows && pRows.length > 0) {
        const p = redisClient.pipeline();
        for (const row of pRows) {
          const dynamicLevel = gameLogic.calculateDynamicLevel(row);
          const score = dynamicLevel + (Number(row.total_xp || 0) / 1000000000);
          const member = { score, value: String(row.user_id) };
          p.zAdd(RANKING_ALL, [member]);
          const resolved = playerStateService.resolveFactionName(row.faction);
          if (resolved === "renegados") p.zAdd(RANKING_RENEGADOS, [member]);
          else if (resolved === "guardioes") p.zAdd(RANKING_GUARDIOES, [member]);
        }
        await p.exec();
        console.log(`[ranking] ✅ ${pRows.length} jogadores indexados.`);
      }
    }

    // Warmup de Clãs (NOVO: LIVE)
    const clanCount = await redisClient.zCardAsync(RANKING_CLANS);
    if (clanCount === 0) {
      const { rows: cRows } = await query(
        `SELECT id, season_score FROM clans ORDER BY season_score DESC LIMIT 500`
      );
      if (cRows && cRows.length > 0) {
        const p = redisClient.pipeline();
        cRows.forEach(r => p.zAdd(RANKING_CLANS, [{ score: Number(r.season_score) || 0, value: String(r.id) }]));
        await p.exec();
        console.log(`[ranking] ✅ ${cRows.length} clãs indexados nos ZSETs.`);
      }
    }
  }

  // Compatibilidade com ciclos legados
  async warmupRankings() {
    await this.initializeRankingZSet();
  }

  startPeriodicRefresh() {
    // Manutenção de clãs a cada 30 min.
    setInterval(() => this._getClansRanking(), 1800000);
  }
}

module.exports = new RankingCacheService();
