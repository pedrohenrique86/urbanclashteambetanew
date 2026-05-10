const redisClient = require("../config/redisClient");

const HISTORY_MAX_LENGTH = 100; // Aumentado para 100 mensagens
const HISTORY_TTL_SECONDS = 604800; // 7 dias de retenção
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const getHistoryKey = (clanId) => `chat:history:${clanId}`;

/**
 * Salva a mensagem exclusivamente no Redis
 */
async function addMessageToHistory(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);

  // Cache no Redis (Fonte única de verdade agora)
  await redisClient.chatHistoryPipeline(
    historyKey,
    messageJson,
    HISTORY_MAX_LENGTH,
    HISTORY_TTL_SECONDS
  );
}

/**
 * Busca histórico do Redis.
 */
async function getChatHistory(clanId) {
  const clanIdNorm = String(clanId ?? "").trim();
  if (!clanIdNorm || clanIdNorm === "null" || clanIdNorm === "undefined") {
    return [];
  }
  
  const historyKey = getHistoryKey(clanIdNorm);

  try {
    const historyJson = await redisClient.lRangeAsync(historyKey, 0, -1);
    
    if (!historyJson || historyJson.length === 0) return [];
    if (historyJson[0] === "EMPTY_MARKER") return [];

    const cutoff = Date.now() - EXPIRY_MS;
    const history = historyJson
      .map((msg) => {
        if (!msg) return null;
        try { return JSON.parse(msg); } catch { return null; }
      })
      .filter((msg) => msg && msg.timestamp && new Date(msg.timestamp).getTime() >= cutoff)
      .reverse();
    
    return history;
  } catch (err) {
    console.error(`[ChatService] ❌ Erro ao buscar histórico:`, err.message);
    return [];
  }
}

async function handleNewMessage(io, socket, text) {
  const { user } = socket;
  if (!user) return;
  
  const rawClanId = user?.clan_id;
  const clanId = (rawClanId && rawClanId !== "null" && rawClanId !== "undefined") ? String(rawClanId).trim() : "";
  if (!clanId) {
    console.warn(`[ChatService] 🛡️ Mensagem rejeitada: Usuário ${user.id} sem clan_id válido. raw=${rawClanId}`);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[ChatService] 📨 Processando mensagem para o clã ${clanId}`);
  }

  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText || trimmedText.length > 200) return;

  const crypto = require('crypto');
  const messageId = crypto.randomUUID();

  const message = {
    id: messageId,
    userId: user.id,
    username: user.username,
    text: trimmedText,
    timestamp: new Date().toISOString(),
  };

  try {
    await addMessageToHistory(clanId, message);
    io.to(`clan:${clanId}`).emit("chat:message", message);
  } catch (err) {
    console.error(`[ChatService] ERRO CRÍTICO no clã ${clanId}:`, err.message);
  }
}

module.exports = { getChatHistory, handleNewMessage };
