const express = require("express");
const sseService = require("../services/sseService");

const router = express.Router();

router.get("/subscribe", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const topic = "ranking";
  sseService.subscribe(res, topic);

  // Envia um evento de confirmação
  res.write(
    `event: connection_established\ndata: ${JSON.stringify({ message: "Conectado aos eventos de ranking." })}\n\n`,
  );

  req.on("close", () => {
    sseService.unsubscribe(res, topic);
  });
});

module.exports = router;