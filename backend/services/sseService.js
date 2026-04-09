const topics = new Map(); // Armazena clientes por tópico

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

function publish(topic, event, data) {
  if (!topics.has(topic)) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const clients = topics.get(topic);

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      console.warn(
        `Falha ao enviar evento SSE para um cliente no tópico ${topic}:`,
        e.message,
      );
      // A remoção do cliente será tratada pelo evento 'close' da requisição
    }
  });
}

// Manter a função de broadcast legada, se necessário, ou refatorá-la para usar o novo sistema
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  // Iterar sobre todos os tópicos e todos os clientes (menos eficiente)
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
      console.warn("Falha ao enviar broadcast SSE para um cliente:", e.message);
    }
  });
}

module.exports = {
  subscribe,
  unsubscribe,
  publish,
  broadcast, // Manter se o broadcast geral ainda for usado em algum lugar
};
