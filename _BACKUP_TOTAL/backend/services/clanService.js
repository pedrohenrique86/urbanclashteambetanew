const { query, transaction } = require("../config/database");
const redisClient = require("../config/redisClient");
const clanMemberService = require("./clanMemberService");
const clanStateService = require("./clanStateService");
const { clearAuthCache } = require("./authService");
const playerStateService = require("./playerStateService");
const sseService = require("./sseService");

class ClanService {
  /**
   * SÊNIOR: Entrar em um clã com proteção atômica e cache-first.
   */
  async joinClan(clanId, userId) {
    return await transaction(async (client) => {
      // 1. Lock do clã para evitar ultrapassar max_members
      const clanResult = await client.query(
        "SELECT id, is_recruiting, member_count, max_members, faction FROM clans WHERE id = $1 FOR UPDATE",
        [clanId]
      );

      if (clanResult.rows.length === 0) throw new Error("Clã não encontrado");
      const clan = clanResult.rows[0];

      if (!clan.is_recruiting) throw new Error("Clã não está recrutando");
      if (clan.member_count >= clan.max_members) throw new Error("Clã está cheio");

      // 2. Verificar se o usuário já tem clã
      const userProfile = await client.query(
        "SELECT clan_id, faction FROM user_profiles WHERE user_id = $1 FOR UPDATE",
        [userId]
      );

      if (userProfile.rows.length === 0) throw new Error("Perfil de usuário não encontrado");
      if (userProfile.rows[0].clan_id) throw new Error("Você já faz parte de um clã");
      
      // Validação de Facção
      if (userProfile.rows[0].faction !== clan.faction) {
        throw new Error("Você só pode entrar em clãs da sua própria facção");
      }

      // 3. Executar a entrada
      await client.query(
        "INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'member')",
        [clanId, userId]
      );

      await client.query(
        "UPDATE user_profiles SET clan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [clanId, userId]
      );

      await client.query(
        "UPDATE clans SET member_count = member_count + 1 WHERE id = $1",
        [clanId]
      );

      // 4. Sincronizar Caches
      await clanMemberService.addMember(clanId, userId);
      await clanStateService.updateClanState(clanId, { member_count: 1 });
      await playerStateService.updatePlayerState(userId, { clan_id: clanId });

      // 5. Notificar via Socket (Room do Clã)
      sseService.publishToClan(clanId, "member_joined", { userId, clanId });
      
      // SÊNIOR: Invalida cache de autenticação para o SocketHandler ver o clã novo
      // e notifica o player para atualizar o estado local imediatamente
      await clearAuthCache(userId);
      sseService.publishToPlayer(userId, "player:update", { clan_id: clanId });

      return { success: true, clanName: clan.name };
    });
  }

  /**
   * SÊNIOR: Sair de um clã com limpeza total de cache.
   */
  async leaveClan(clanId, userId) {
    return await transaction(async (client) => {
      const memberRes = await client.query(
        "SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2 FOR UPDATE",
        [userId, clanId]
      );

      if (memberRes.rows.length === 0) {
        // Fallback: garante que o perfil esteja limpo mesmo se a tabela de membros falhar
        await client.query("UPDATE user_profiles SET clan_id = NULL WHERE user_id = $1", [userId]);
        return { success: true, message: "Vínculo removido" };
      }

      if (memberRes.rows[0].role === "leader") {
        throw new Error("O líder não pode abandonar o clã sem transferir a liderança");
      }

      await client.query("DELETE FROM clan_members WHERE user_id = $1 AND clan_id = $2", [userId, clanId]);
      await client.query("UPDATE user_profiles SET clan_id = NULL WHERE user_id = $1", [userId]);
      await client.query("UPDATE clans SET member_count = member_count - 1 WHERE id = $1", [clanId]);

      // Sincronizar Caches
      await clanMemberService.removeMember(clanId, userId);
      await clanStateService.updateClanState(clanId, { member_count: -1 });
      await playerStateService.updatePlayerState(userId, { clan_id: "" });

      // Invalida cache de autenticação
      await clearAuthCache(userId);

      // Notificar Clã e Player
      sseService.publishToClan(clanId, "member_left", { userId, clanId });
      sseService.publishToPlayer(userId, "player:update", { clan_id: "" });

      return { success: true };
    });
  }
}

module.exports = new ClanService();
