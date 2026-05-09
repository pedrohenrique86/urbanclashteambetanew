const topics = new Map(); // Armazena clientes por tópico
let redisPublisher = null;
let redisSubscriber = null;
const redisClient = require("../config/redisClient"); // SÊNIOR: Reutiliza o wrapper central
const ONLINE_SET_KEY = "online_players_set";

/**
 * SÊNIOR: Inicializa a ponte Redis Pub/Sub para que o SSE funcione 
 * entre múltiplos processos (ex: scripts CLI -> Servidor Web)
 */
async function initRedisBridge() {
  const redis = require("redis");
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const password = process.env.REDIS_PASSWORD || undefined;

    // Client para publicar
    redisPublisher = redis.createClient({ url, password });
    redisPublisher.on("error", (err) => {
      // Ignora erros de socket fechado que ocorrem durante reconexão
    });

    // Client para ouvir
    redisSubscriber = redis.createClient({ url, password });
    redisSubscriber.on("error", (err) => {
      // Ignora erros de socket fechado
    });

    await redisPublisher.connect();
    await redisSubscriber.connect();

    // Link: Qualquer mensagem no canal 'SSE_BRIDGE' é repassada para os clientes locais
    await redisSubscriber.subscribe("SSE_BRIDGE", (message) => {
      try {
        const { topic, event, data, action, userId } = JSON.parse(message);
        
        // SÊNIOR: Suporte a ações administrativas via Bridge (ex: KICK)
        if (action === "KICK") {
          _localKick(userId, data?.excludeCid);
          return;
        }

        if (topic === "all") {
          _localPublishAll(event, data);
        } else {
          _localPublish(topic, event, data);
        }
      } catch (err) {
        console.error("[SSE-Bridge] Erro ao processar mensagem Redis:", err.message);
      }
    });

    console.log("✅ SSE-Bridge (Redis Pub/Sub) Ativado.");
  } catch (err) {
    console.error("⚠️ Falha ao iniciar SSE-Bridge (Redis indisponível):", err.message);
    console.log("🔄 Tentando reconectar SSE-Bridge em 5 segundos...");
    setTimeout(initRedisBridge, 5000);
  }
}

function subscribe(client, topic, cid = null) {
  // 1. Atrela o CID ao cliente PRIMEIRO
  client.cid = cid;

  // 2. Registra o novo cliente no tópico ANTES de qualquer kick
  //    Isso garante que nunca haja uma janela onde o tópico fica vazio.
  if (!topics.has(topic)) {
    topics.set(topic, new Set());

    if (topic.startsWith("player:")) {
      const userId = topic.replace("player:", "");
      redisClient.sAddAsync(ONLINE_SET_KEY, userId).catch(() => {});
      redisClient.hGetAsync(`playerState:${userId}`, "faction").then(faction => {
        if (faction) {
          const canonical = faction.toLowerCase().trim().includes('guard') ? 'guardas' : 'gangsters';
          redisClient.sAddAsync(`${ONLINE_SET_KEY}:${canonical}`, userId).catch(() => {});
        }
      }).catch(() => {});
    }
  }
  topics.get(topic).add(client);

  // 3. SÓ DEPOIS de registrado: kick sessões antigas (apenas local, sem Redis bounce)
  if (topic.startsWith("player:")) {
    const userId = topic.replace("player:", "");
    _localKick(userId, cid);
  }
}

function unsubscribe(client, topic) {
  if (topics.has(topic)) {
    topics.get(topic).delete(client);
    if (topics.get(topic).size === 0) {
      topics.delete(topic);

      if (topic.startsWith("player:")) {
        const userId = topic.replace("player:", "");
        redisClient.sRemAsync(ONLINE_SET_KEY, userId).catch(() => {});
        redisClient.sRemAsync(`${ONLINE_SET_KEY}:gangsters`, userId).catch(() => {});
        redisClient.sRemAsync(`${ONLINE_SET_KEY}:guardas`, userId).catch(() => {});
      }
    }
  }
}

/** 
 * Envia para os clientes conectados NESTE processo.
 * Usado internamente pelo listener do Redis.
 */
function _localPublish(topic, event, data) {
  if (!topics.has(topic)) return;

  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const clients = topics.get(topic);

  clients.forEach((client) => {
    try {
      client.write(msg);
    } catch (e) {
      // Remoção automática via evento 'close' da req
    }
  });
}

/**
 * Publica um evento. 
 * Se o Redis estiver ativo, envia para a ponte (alcança todos os processos).
 * Se não, tenta enviar apenas localmente.
 */
function publish(topic, event, data) {
  if (redisPublisher && redisPublisher.isOpen) {
    redisPublisher.publish("SSE_BRIDGE", JSON.stringify({ topic, event, data }))
      .catch(err => console.error("[SSE] Erro ao publicar no Redis:", err.message));
  } else {
    _localPublish(topic, event, data);
  }
}

function broadcast(event, data) {
  // SÊNIOR: Se o Redis estiver ativo, envia para a ponte com tópico 'all'
  // permitindo que todos os processos recebam e enviem para seus clientes locais.
  if (redisPublisher && redisPublisher.isOpen) {
    redisPublisher.publish("SSE_BRIDGE", JSON.stringify({ topic: "all", event, data }))
      .catch(err => console.error("[SSE] Erro ao transmitir broadcast no Redis:", err.message));
  } else {
    // Fallback: Apenas local
    _localPublishAll(event, data);
  }
}

/** Envia para TODOS os clientes conectados NESTE processo. */
function _localPublishAll(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const clientSet of topics.values()) {
    for (const client of clientSet) {
      try {
        client.write(message);
      } catch (e) {
        // Falha silenciosa
      }
    }
  }
}

/**
 * Remove e desconecta sessões antigas de um jogador no processo local.
 * - Remove do Set IMEDIATAMENTE (evita enviar eventos para clientes mortos)
 * - Envia evento de kick e fecha TCP após delay seguro
 * - excludeCid: ignora o cliente com este ID (a sessão nova que acabou de entrar)
 */
function _localKick(userId, excludeCid = null) {
  const topic = `player:${userId}`;
  if (!topics.has(topic)) return;

  const clients = topics.get(topic);
  const kickMsg = `event: security:duplicate_session\ndata: ${JSON.stringify({ message: "Sessão finalizada: outra aba foi aberta." })}\n\n`;

  // Coleta antes de iterar (evita modificar Set durante forEach)
  const toKick = [];
  for (const client of clients) {
    if (excludeCid && client.cid === excludeCid) continue;
    toKick.push(client);
  }

  for (const client of toKick) {
    // Remove do Set IMEDIATAMENTE — publish() nunca mais envia para este client
    clients.delete(client);

    try {
      client.write(kickMsg);
    } catch (e) { /* stream já fechada */ }

    // Fecha TCP após delay para o evento chegar no frontend
    setTimeout(() => {
      try { client.end(); } catch (e) { /* já fechada */ }
    }, 1500);
  }
}

// Inicia a ponte automaticamente se estiver em modo servidor
if (process.env.NODE_ENV !== "test") {
  initRedisBridge();
}

module.exports = {
  initRedisBridge,
  subscribe,
  unsubscribe,
  publish,
  broadcast,
  /** Retorna true se houver ao menos um cliente SSE conectado ao tópico */
  hasSubscribers: (topic) => topics.has(topic) && topics.get(topic).size > 0,
};
