const topics = new Map(); // Armazena clientes por tópico
let redisPublisher = null;
let redisSubscriber = null;

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
    await redisPublisher.connect();

    // Client para ouvir
    redisSubscriber = redis.createClient({ url, password });
    await redisSubscriber.connect();

    // Link: Qualquer mensagem no canal 'SSE_BRIDGE' é repassada para os clientes locais
    await redisSubscriber.subscribe("SSE_BRIDGE", (message) => {
      try {
        const { topic, event, data } = JSON.parse(message);
        _localPublish(topic, event, data);
      } catch (err) {
        console.error("[SSE-Bridge] Erro ao processar mensagem Redis:", err.message);
      }
    });

    console.log("✅ SSE-Bridge (Redis Pub/Sub) Ativado.");
  } catch (err) {
    console.error("⚠️ Falha ao iniciar SSE-Bridge (Redis indisponível):", err.message);
  }
}

function subscribe(client, topic) {
  if (!topics.has(topic)) {
    topics.set(topic, new Set());
  }
  topics.get(topic).add(client);
}

function unsubscribe(client, topic) {
  if (topics.has(topic)) {
    topics.get(topic).delete(client);
    if (topics.get(topic).size === 0) {
      topics.delete(topic);
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
 * SÊNIOR: Publica um evento. 
 * Se o Redis estiver ativo, envia para a ponte (alcança todos os processos).
 * Se não, tenta enviar apenas localmente.
 */
function publish(topic, event, data) {
  if (redisPublisher && redisPublisher.isOpen) {
    redisPublisher.publish("SSE_BRIDGE", JSON.stringify({ topic, event, data }))
      .catch(err => console.error("[SSE] Erro ao publicar no Redis:", err.message));
  } else {
    // Fallback: se Redis cair, pelo menos funciona no mesmo processo
    _localPublish(topic, event, data);
  }
}

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const allClients = new Set();
  for (const clientSet of topics.values()) {
    for (const client of clientSet) {
      allClients.add(client);
    }
  }

  allClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      // Falha silenciosa
    }
  });
}

// Inicia a ponte automaticamente se estiver em modo servidor
if (process.env.NODE_ENV !== "test") {
  initRedisBridge();
}

module.exports = {
  subscribe,
  unsubscribe,
  publish,
  broadcast,
};
