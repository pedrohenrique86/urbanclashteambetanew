const { query, transaction } = require("../config/database");
const redisClient = require("../config/redisClient");
const { clearAuthCache } = require("../services/authService");
const playerStateService = require("../services/playerStateService");

const userId = "1a88ff6b-8f98-4ff0-a7f4-e80d90e3025d";

async function fixUserClanStatus() {
  console.log(`🛠️ Iniciando correção forçada de clã para o usuário: ${userId}`);
  
  try {
    // 1. Banco de Dados
    await transaction(async (client) => {
      // Remover de clan_members
      const delRes = await client.query("DELETE FROM clan_members WHERE user_id = ?", [userId]);
      if (delRes.rows.length > 0) {
        const clanId = delRes.rows[0].clan_id;
        console.log(`✅ Removido da tabela clan_members (Clã anterior: ${clanId})`);
        // Decrementar contagem do clã
        await client.query("UPDATE clans SET member_count = MAX(0, member_count - 1) WHERE id = ?", [clanId]);
      }

      // Limpar user_profiles
      await client.query("UPDATE user_profiles SET clan_id = NULL WHERE user_id = ?", [userId]);
      console.log("✅ Perfil atualizado no banco (clan_id = NULL)");
    });

    // 2. Redis - Estado do Jogador
    await playerStateService.updatePlayerState(userId, { clan_id: "" });
    console.log("✅ Estado do jogador no Redis atualizado (clan_id = \"\")");

    // 3. Redis - Cache de Autenticação
    await clearAuthCache(userId);
    console.log("✅ Cache de autenticação invalidado");

    console.log("🚀 Correção concluída com sucesso! O usuário agora deve estar livre para entrar em um novo clã.");
  } catch (err) {
    console.error("❌ Erro durante a correção:", err.message);
  } finally {
    process.exit();
  }
}

fixUserClanStatus();
