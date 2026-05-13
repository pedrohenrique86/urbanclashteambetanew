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

    console.log("\x1b[36m[Redis]\x1b[0m ✅ SSE-Bridge (Pub/Sub) Ativado");
  } catch (err) {
    console.error("\x1b[31m[Redis]\x1b[0m ⚠️ Falha ao iniciar SSE-Bridge:", err.message);
    console.log("\x1b[33m[Redis]\x1b[0m 🔄 Tentando reconectar SSE-Bridge em 5 segundos...");
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
      const playerStateService = require("./playerStateService");
      
      redisClient.sAddAsync(ONLINE_SET_KEY, userId).catch(() => {});
      
      // SÊNIOR: Não usa hGet direto pois o Redis pode ter sido resetado.
      // Usa o service que garante a hidratação vinda do DB.
      playerStateService.getPlayerState(userId).then(state => {
        if (state && state.faction) {
          const canonical = playerStateService.resolveFactionName(state.faction);
          const alias = canonical === "guardioes" ? "guardas" : "gangsters";
          redisClient.sAddAsync(`${ONLINE_SET_KEY}:${alias}`, userId).catch(() => {});
        }
      }).catch(err => {
        console.error(`[SSE] Erro ao recuperar facção para online_set (uid=${userId}):`, err.message);
      });
    }
  }
  topics.get(topic).add(client);

  // 3. SÓ DEPOIS de registrado: kick sessões antigas (apenas local, sem Redis bounce)
  if (topic.startsWith("player:")) {
    const userId = topic.replace("player:", "");
    _localKick(userId, cid);
    
    // SÊNIOR: Entrega imediata de notificações acumuladas enquanto offline
    _flushOfflineToasts(userId, client);
  }
}

/** 
 * SÊNIOR: Recupera notificações acumuladas no Redis para o jogador e as envia.
 */
async function _flushOfflineToasts(userId, client) {
  const key = `offline_toasts:${userId}`;
  try {
    const toasts = await redisClient.lRangeAsync(key, 0, -1);
    if (toasts && toasts.length > 0) {
      // Inverte para mandar na ordem correta (FIFO) já que usamos LPUSH
      toasts.reverse().forEach(tStr => {
        const { event, data } = JSON.parse(tStr);
        const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        client.write(msg);
      });
      await redisClient.delAsync(key);
      console.log(`[SSE] 📬 Entregues ${toasts.length} notificações offline para ${userId}.`);
    }
  } catch (err) {
    console.error(`[SSE] Erro ao flush toasts para ${userId}:`, err.message);
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
  // 1. Envio via SSE (Legado/Compatibilidade)
  if (topics.has(topic)) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const clients = topics.get(topic);
    clients.forEach((client) => {
      try { client.write(msg); } catch (e) {}
    });
  }

  // 2. SÊNIOR: Envio via WebSocket Nativo (Alta Performance)
  try {
    const { getIO } = require("../socketHandlerNative");
    const io = getIO();
    if (io) {
      if (topic.startsWith("player:")) {
        const userId = topic.replace("player:", "");
        io.to(`user:${userId}`).emit(event, data);
      } else if (topic.startsWith("clan:")) {
        const clanId = topic.replace("clan:", "");
        io.to(`clan:${clanId}`).emit(event, data);
      }
    }
  } catch (err) {
    // socketHandler pode não estar inicializado em scripts CLI
  }
}

/**
 * Publica um evento. 
 * Se o Redis estiver ativo, envia para a ponte (alcança todos os processos).
 * Se não, tenta enviar apenas localmente.
 */
async function publish(topic, event, data) {
  // SÊNIOR: Se o tópico for de jogador e não houver ninguém ouvindo em nenhum processo
  // (verificado via Redis Pub/Sub indireto ou via checks locais de fallback)
  // Armazenamos para entrega futura se for um evento do tipo 'toast' ou 'update' crítico.
  if (topic.startsWith("player:") && (event === "player:update" || event === "player:toast")) {
    const userId = topic.replace("player:", "");
    const online = await redisClient.sIsMemberAsync(ONLINE_SET_KEY, userId).catch(() => false);
    
    if (!online) {
      const key = `offline_toasts:${userId}`;
      await redisClient.lPushAsync(key, JSON.stringify({ event, data }));
      await redisClient.lTrimAsync(key, 0, 19); // Mantém apenas os últimos 20
      await redisClient.expireAsync(key, 86400 * 2); // Expira em 48h
      return;
    }
  }

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
  // 1. Envio para Clientes SSE
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const clientSet of topics.values()) {
    for (const client of clientSet) {
      try { client.write(message); } catch (e) {}
    }
  }

  // 2. SÊNIOR: Envio para Clientes WebSocket Nativo (Global)
  try {
    const { getIO } = require("../socketHandlerNative");
    const io = getIO();
    if (io) {
      // O getIO do Native devolve um objeto que faz broadcast global se não for filtrado
      io.to("all").emit(event, data);
    }
  } catch (err) {}
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
  /** SÊNIOR: Atalho para publicar eventos diretamente para um jogador */
  publishToPlayer: (userId, event, data) => publish(`player:${userId}`, event, data),
  /** Legado: Alias para publishToPlayer */
  broadcastToUser: (userId, event, data) => publish(`player:${userId}`, event, data),
  /** SÊNIOR: Envia mensagem para todos os membros de um clã */
  publishToClan: (clanId, event, data) => publish(`clan:${clanId}`, event, data)
};
