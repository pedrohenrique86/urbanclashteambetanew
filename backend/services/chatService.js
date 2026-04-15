const redisClient = require("../config/redisClient");

const HISTORY_MAX_LENGTH = 50;
const HISTORY_TTL_SECONDS = 86400; // 24h
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const CLAN_ROOM_PREFIX = "clan:";

const getHistoryKey = (clanId) => `chat:history:${clanId}`;
const getClanRoom = (clanId) => `${CLAN_ROOM_PREFIX}${clanId}`;

async function addMessageToHistory(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);
  await redisClient.chatHistoryPipeline(
    historyKey,
    messageJson,
    HISTORY_MAX_LENGTH,
    HISTORY_TTL_SECONDS
  );
}

async function getChatHistory(clanId) {
  const clanIdNorm = String(clanId ?? "").trim();
  if (!clanIdNorm || clanIdNorm === "null" || clanIdNorm === "undefined") {
    console.error("[ChatService] Tentativa de ler histórico sem clanId válido");
    return [];
  }
  const historyKey = getHistoryKey(clanIdNorm);

  try {
    const historyJson = await redisClient.lRangeAsync(historyKey, 0, -1);
    
    // Log apenas em produção se o histórico vier vazio quando não deveria
    if (!Array.isArray(historyJson)) {
      console.error(`[ChatService] Retorno inválido do Redis para chave ${historyKey}:`, typeof historyJson);
      return [];
    }

    if (historyJson.length === 0) return [];

    const cutoff = Date.now() - EXPIRY_MS;
    return historyJson
      .map((msg) => {
        if (!msg) return null;
        // Se já for objeto (comum no Upstash REST SDK), retorna direto. Se for string, faz o parse.
        if (typeof msg === "object") return msg;
        try { 
          return JSON.parse(msg); 
        } catch (err) { 
          console.error("[ChatService] Falha ao parsear mensagem do histórico:", msg);
          return null; 
        }
      })
      .filter((msg) => {
        const isValid = msg && msg.timestamp && new Date(msg.timestamp).getTime() >= cutoff;
        return isValid;
      })
      .reverse();
  } catch (err) {
    console.error(`[ChatService] Erro ao buscar histórico do clã ${clanId}:`, err.message);
    return [];
  }
}

async function handleNewMessage(io, socket, text) {
  const { user } = socket;
  if (!user) return; // Proteção adicional contra socket sem payload de usuário
  
  const clanId = String(user?.clan_id ?? "").trim();

  if (!clanId || clanId === "null" || clanId === "undefined") {
    console.warn(`[ChatService] BLOQUEIO: Usuário ${socket.id} sem clan_id válido.`);
    return;
  }

  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText) return;

  const clanRoom = `clan:${clanId}`;
  const message = {
    userId: user.id,
    username: user.username,
    text: trimmedText,
    timestamp: new Date().toISOString(),
  };

  try {
    await addMessageToHistory(clanId, message);
    io.to(clanRoom).emit("chat:message", message);
  } catch (err) {
    console.error(`[ChatService] ERRO CRÍTICO no clã ${clanId}:`, err.message);
  }
}

module.exports = { getChatHistory, handleNewMessage };
