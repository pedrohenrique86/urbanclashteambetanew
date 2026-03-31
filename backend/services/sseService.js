const clients = new Set();

function addClient(client) {
  clients.add(client);
}

function removeClient(client) {
  clients.delete(client);
}

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      console.warn("Falha ao enviar evento SSE para um cliente:", e.message);
      removeClient(client); // Remove cliente com conexão quebrada
    }
  });
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
};