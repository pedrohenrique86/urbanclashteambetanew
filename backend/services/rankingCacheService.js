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
   * Obtém o ranking atualizado em tempo real.
   * @param {string} type - 'users' ou 'clans'
   * @param {string} faction - 'all', 'renegados', 'guardioes'
   */
  async ensureFreshRanking(type, faction) {
    if (type === "clans") {
      return this._getClansRanking();
    }
    return this._getUsersRanking(faction || "all");
  }

  /**
   * Ranking de Jogadores via ZSET (Tempo Real)
   */
  async _getUsersRanking(faction) {
    let zkey = RANKING_ALL;
    if (faction === "renegados") zkey = RANKING_RENEGADOS;
    if (faction === "guardioes") zkey = RANKING_GUARDIOES;

    // Pega os Top 200 do ZSET (Score desc)
    const topIds = await redisClient.zRevRangeAsync(zkey, 0, 199);
    
    if (!topIds || topIds.length === 0) {
      return { data: [], etag: "empty", timestamp: Date.now() };
    }

    // Hydration em lote (MGET/Pipeline)
    const pipeline = redisClient.pipeline();
    topIds.forEach(id => pipeline.hGetAll(`${PLAYER_STATE_PREFIX}${id}`));
    const results = await pipeline.exec();

    const hydrated = [];
    const missingIds = [];

    results.forEach((raw, i) => {
      if (raw && Object.keys(raw).length > 0) {
        const state = playerStateService._parseState(raw);
        hydrated.push(this._formatPlayer(state, i + 1));
      } else {
        missingIds.push(topIds[i]);
      }
    });

    // Fallback para o Banco se algum jogador não estiver no Redis
    if (missingIds.length > 0) {
      const dbPlayers = await this._fetchPlayersFromDB(missingIds);
      dbPlayers.forEach((p, i) => {
        hydrated.push({ ...p, rank: hydrated.length + 1 });
      });
    }

    // Ordenação final por segurança
    hydrated.sort((a, b) => b.level - a.level || b.total_xp - a.total_xp);
    
    const finalData = hydrated.map((p, i) => ({ ...p, rank: i + 1 }));

    return {
      data: finalData,
      etag: `W/"${Date.now()}"`, // ETag dinâmica
      timestamp: Date.now()
    };
  }

  /**
   * Formata os dados para o contrato do Frontend
   */
  _formatPlayer(state, rank) {
    const total_xp = Number(state.total_xp || 0);
    const level = Number(state.level || 1);
    const xpLevelPure = gameLogic.calculateLevelFromXp(total_xp);
    const xpStatus = gameLogic.deriveXpStatus(total_xp, xpLevelPure);

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
      console.error("[ranking] Erro no fallback DB:", e.message);
      return [];
    }
  }

  /**
   * Ranking de Clãs (Ainda via DB, clãs mudam pouco)
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
      `SELECT user_id, level, total_xp, faction FROM user_profiles ORDER BY level DESC, total_xp DESC LIMIT 1000`
    );

    for (const row of rows) {
      await playerStateService._updateRankingScore(row.user_id, row);
    }
    console.log(`[ranking] ✅ ${rows.length} jogadores indexados nos ZSETs.`);
  }

  // Compatibilidade com ciclos legados
  async warmupRankings() {
    await this.initializeRankingZSet();
    // Clãs podem ser atualizados aqui se necessário
  }

  startPeriodicRefresh() {
    // No modelo real-time, não precisamos de refresh periódico para usuários!
    // Apenas para manutenção de clãs a cada 30 min.
    setInterval(() => this._getClansRanking(), 1800000);
  }
}

module.exports = new RankingCacheService();
