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

        _localPublish(topic, event, data);
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
  // SÊNIOR: Single Session Enforcement (Anti-Multi-Aba)
  // Se for um tópico de jogador, derrubamos sessões anteriores ANTES de aceitar a nova.
  if (topic.startsWith("player:")) {
    const userId = topic.replace("player:", "");
    
    // 1. Kick Local (Mesmo Processo)
    // Passamos o cid para que o _localKick não derrube a própria conexão que está entrando.
    _localKick(userId, cid);

    // 2. Kick Global (Outros Processos via Redis)
    if (redisPublisher && redisPublisher.isOpen) {
      redisPublisher.publish("SSE_BRIDGE", JSON.stringify({ 
        action: "KICK", 
        userId, 
        data: { excludeCid: cid } 
      })).catch(() => {});
    }
  }

  // Atrela o CID ao cliente para identificação futura
  client.cid = cid;

  if (!topics.has(topic)) {
    topics.set(topic, new Set());
    
    // SÊNIOR: Se é um novo canal de jogador, marca como online no Redis
    if (topic.startsWith("player:")) {
      const userId = topic.replace("player:", "");
      redisClient.sAddAsync(ONLINE_SET_KEY, userId).catch(() => {});

      // SÊNIOR: Indexação por Facção para Matchmaking Ultra-Rápido (O(1))
      // Buscamos a facção no Redis para categorizar o jogador online.
      // Isso permite que o Radar busque diretamente inimigos sem filtrar 5000+ IDs no JS.
      redisClient.hGetAsync(`playerState:${userId}`, "faction").then(faction => {
        if (faction) {
          const canonical = faction.toLowerCase().trim().includes('guard') ? 'guardas' : 'gangsters';
          redisClient.sAddAsync(`${ONLINE_SET_KEY}:${canonical}`, userId).catch(() => {});
        }
      }).catch(() => {});
    }
  }
  topics.get(topic).add(client);
}

function unsubscribe(client, topic) {
  if (topics.has(topic)) {
    topics.get(topic).delete(client);
    if (topics.get(topic).size === 0) {
      topics.delete(topic);
      
      // SÊNIOR: Se ninguém mais ouve este jogador, remove do set de online
      if (topic.startsWith("player:")) {
        const userId = topic.replace("player:", "");
        redisClient.sRemAsync(ONLINE_SET_KEY, userId).catch(() => {});
        // Limpa de ambos os índices de facção por segurança
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

/**
 * SÊNIOR: Remove e desconecta todos os clientes de um jogador no processo local.
 * excludeCid: Opcional. Se fornecido, ignora o cliente com este ID (evita auto-kick).
 */
function _localKick(userId, excludeCid = null) {
  const topic = `player:${userId}`;
  if (topics.has(topic)) {
    const clients = topics.get(topic);
    const kickMsg = `event: security:duplicate_session\ndata: ${JSON.stringify({ message: "Sessão finalizada: outra aba foi aberta." })}\n\n`;
    
    clients.forEach(client => {
      // SÊNIOR: Pulo do gato — não chuta a própria conexão que acabou de pedir o subscribe!
      if (excludeCid && client.cid === excludeCid) return;

      try {
        client.write(kickMsg);
        // Pequeno delay para garantir que o evento chegue antes de fechar o socket
        setTimeout(() => {
          try { client.end(); } catch(e) {}
        }, 100);
      } catch (e) {}
    });

    // Se após o kick não sobrou ninguém (ou apenas o excluído), limpamos se necessário
    // (O subscribe vai adicionar o novo logo em seguida).
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
