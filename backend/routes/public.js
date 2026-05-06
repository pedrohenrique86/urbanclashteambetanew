const express = require("express");
const cors = require("cors");
const rankingCacheService = require("../services/rankingCacheService");
const sseService = require("../services/sseService");

const router = express.Router();

router.use(cors({ origin: "*" }));

router.get("/rankings", async (req, res) => {
  try {
    const gangsters = await rankingCacheService.ensureFreshRanking("users", "gangsters");
    const guardas = await rankingCacheService.ensureFreshRanking("users", "guardas");
    const clans = await rankingCacheService.ensureFreshRanking("clans", null);

    res.json({
      gangsters: gangsters.data,
      guardas: guardas.data,
      clans: clans.data
    });
  } catch (error) {
    console.error("❌ Erro no ranking público:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/rankings/subscribe", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  if (res.flushHeaders) res.flushHeaders();
  // SÊNIOR: Padding para forçar proxies a entregar o stream imediatamente no mobile
  res.write(" ".repeat(1024) + "\n");
  res.write("\n");

  sseService.subscribe(res, "ranking");

  res.write(`event: connection_established\ndata: ${JSON.stringify({ message: "Conectado ao ranking público em tempo real." })}\n\n`);

  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {
      clearInterval(pingInterval);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(pingInterval);
    sseService.unsubscribe(res, "ranking");
  });
});

module.exports = router;
