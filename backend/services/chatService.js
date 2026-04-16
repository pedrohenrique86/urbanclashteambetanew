const redisClient = require("../config/redisClient");
const db = require("../config/database");

const HISTORY_MAX_LENGTH = 20; // Padronizado em 20 como solicitado
const HISTORY_TTL_SECONDS = 86400; // 24h
const EXPIRY_MS = 24 * 60 * 60 * 1000;

const getHistoryKey = (clanId) => `chat:history:${clanId}`;

/**
 * Salva a mensagem no Banco de Dados e atualiza o Cache (Redis)
 */
async function addMessageToHistory(clanId, message) {
  const historyKey = getHistoryKey(clanId);
  const messageJson = JSON.stringify(message);

  // 1. Persistência em Banco (Fonte de Verdade Oficial)
  try {
    const query = `
      INSERT INTO chat_messages (id, clan_id, user_id, text, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    // Usamos o id gerado no message se existir, ou deixamos o DB gerar
    await db.query(query, [
      message.id,
      clanId,
      message.userId,
      message.text,
      message.timestamp
    ]);
  } catch (err) {
    console.error(`[ChatService] Erro ao salvar mensagem no Banco:`, err.message);
    // Continuamos para o Redis mesmo se o banco falhar (prioridade tempo real)
  }

  // 2. Cache no Redis (Para leitura rápida das últimas 20)
  await redisClient.chatHistoryPipeline(
    historyKey,
    messageJson,
    HISTORY_MAX_LENGTH,
    HISTORY_TTL_SECONDS
  );
}

/**
 * Busca histórico: Tenta Redis primeiro (fast path), Fallback no Banco.
 */
async function getChatHistory(clanId) {
  const clanIdNorm = String(clanId ?? "").trim();
  if (!clanIdNorm || clanIdNorm === "null" || clanIdNorm === "undefined") {
    console.error("[ChatService] Tentativa de ler histórico sem clanId válido");
    return [];
  }
  
  const historyKey = getHistoryKey(clanIdNorm);

  try {
    // 1. Tentar ler do Cache (Redis)
    const historyJson = await redisClient.lRangeAsync(historyKey, 0, -1);
    
    if (Array.isArray(historyJson) && historyJson.length > 0) {
      const cutoff = Date.now() - EXPIRY_MS;
      const history = historyJson
        .map((msg) => {
          if (!msg) return null;
          if (typeof msg === "object") return msg;
          try { return JSON.parse(msg); } catch { return null; }
        })
        .filter((msg) => msg && msg.timestamp && new Date(msg.timestamp).getTime() >= cutoff)
        .reverse();
      
      if (history.length > 0) return history;
    }

    // 2. Fallback no Banco (Se Redis estiver vazio ou falhar)
    console.log(`[ChatService] Redis vazio para clã ${clanIdNorm}. Buscando no Banco (últimas 24h)...`);
    const { rows } = await db.query(
      `SELECT m.id, m.user_id as "userId", u.username, m.text, m.created_at as "timestamp"
       FROM chat_messages m
       INNER JOIN users u ON m.user_id = u.id
       WHERE m.clan_id = $1 
         AND m.created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY m.created_at DESC 
       LIMIT $2`,
      [clanIdNorm, HISTORY_MAX_LENGTH]
    );

    // Formatar e converter timestamps para ISO para consistência
    const dbHistory = rows.reverse().map(row => ({
      ...row,
      username: 'Membro', // Username será resolvido no front ou via JOIN (idealmente JOIN no futuro)
      timestamp: new Date(row.timestamp).toISOString()
    }));

    return dbHistory;

  } catch (err) {
    console.error(`[ChatService] Erro ao buscar histórico do clã ${clanId}:`, err.message);
    return [];
  }
}

async function handleNewMessage(io, socket, text) {
  const { user } = socket;
  if (!user) return;
  
  const clanId = String(user?.clan_id ?? "").trim();
  if (!clanId || clanId === "null" || clanId === "undefined") return;

  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText) return;

  // Gerar ID robusto aqui no Backend (RFC4122 v4)
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
