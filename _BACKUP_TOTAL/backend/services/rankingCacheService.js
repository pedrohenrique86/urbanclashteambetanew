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
      level: level,
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
        `SELECT * FROM user_profiles WHERE user_id IN (${ids.map((_, i) => `$${i+1}`).join(',')})`,
        ids
      );
      return rows.map(r => this._formatPlayer(r, 0));
    } catch (e) {
      console.error("[ranking] ❌ Erro no fallback DB:", e.message);
      return [];
    }
  }

  /**
   * Ranking de Clãs (Cache Permanente de 10 min)
   */
  async _getClansRanking() {
    const cacheKey = "ranking:clans:all";
    const cached = await redisClient.getAsync(cacheKey);
    if (cached) return JSON.parse(cached);

    const { rows } = await query(
      `SELECT id, name, faction, season_score as score, member_count 
       FROM clans ORDER BY season_score DESC LIMIT 26`
    );
    
    const result = { data: rows, etag: `W/"clans-${Date.now()}"`, timestamp: Date.now() };
    await redisClient.setAsync(cacheKey, JSON.stringify(result), "EX", 600);
    return result;
  }

  /**
   * Warmup Inicial: Popula os ZSETs a partir do banco de dados.
   */
  async initializeRankingZSet() {
    const count = await redisClient.zCardAsync(RANKING_ALL);
    if (count > 0) return;

    console.log("[ranking] 🔄 Populando ZSETs de ranking pela primeira vez...");
    const { rows } = await query(
      `SELECT user_id, level, total_xp, faction FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 2000`
    );

    for (const row of rows) {
      await playerStateService._updateRankingScore(row.user_id, row);
    }
    console.log(`[ranking] ✅ ${rows.length} jogadores indexados nos ZSETs.`);
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
