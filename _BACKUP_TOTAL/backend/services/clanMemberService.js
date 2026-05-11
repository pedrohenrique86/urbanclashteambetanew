const redisClient = require("../config/redisClient");
const { query } = require("../config/database");

/**
 * ClanMemberService
 * 
 * Gerencia a lista de membros de clãs no Redis.
 * Fonte de Verdade: PostgreSQL
 * Cache de Alta Performance: Redis Set (clan:members:{clanId})
 */
class ClanMemberService {
  constructor() {
    this.PREFIX = "clan:members:";
    this.TTL = 3600 * 12; // 12 horas
  }

  /**
   * Garante que os membros do clã estejam no Redis.
   */
  async ensureLoaded(clanId) {
    const key = `${this.PREFIX}${clanId}`;
    const exists = await redisClient.existsAsync(key);

    if (!exists) {
      const { rows } = await query(
        "SELECT user_id FROM clan_members WHERE clan_id = $1",
        [clanId]
      );

      if (rows.length > 0) {
        const pipeline = redisClient.pipeline();
        rows.forEach(row => pipeline.sAdd(key, String(row.user_id)));
        pipeline.expire(key, this.TTL);
        await pipeline.exec();
      } else {
        // Marcador de vazio para evitar cache miss negativo
        await redisClient.sAddAsync(key, "_empty");
        await redisClient.expireAsync(key, 60);
      }
    }
  }

  /**
   * Adiciona um membro ao clã (Redis-First).
   */
  async addMember(clanId, userId) {
    const key = `${this.PREFIX}${clanId}`;
    await this.ensureLoaded(clanId);
    await redisClient.sAddAsync(key, String(userId));
    await redisClient.sRemAsync(key, "_empty");
  }

  /**
   * Remove um membro do clã (Redis-First).
   */
  async removeMember(clanId, userId) {
    const key = `${this.PREFIX}${clanId}`;
    await this.ensureLoaded(clanId);
    await redisClient.sRemAsync(key, String(userId));
  }

  /**
   * Retorna todos os IDs dos membros do clã.
   */
  async getMemberIds(clanId) {
    const key = `${this.PREFIX}${clanId}`;
    await this.ensureLoaded(clanId);
    const members = await redisClient.sMembersAsync(key);
    return members.filter(id => id !== "_empty");
  }

  /**
   * Verifica se um usuário é membro de um clã.
   */
  async isMember(clanId, userId) {
    const key = `${this.PREFIX}${clanId}`;
    await this.ensureLoaded(clanId);
    return await redisClient.sIsMemberAsync(key, String(userId));
  }
}

module.exports = new ClanMemberService();
