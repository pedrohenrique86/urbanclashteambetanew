const express = require("express");
const router = express.Router();
const { getGameState, getGameStatus } = require("../services/gameStateService");

// GET /api/game/state - Retorna estado completo do jogo (público)
router.get("/state", async (req, res) => {
  try {
    const gameState = await getGameState();
    res.status(200).json({
      success: true,
      gameState: {
        status: gameState.status,
        isActive: gameState.isActive,
        isPaused: gameState.isPaused,
        startTime: gameState.startTime,
        endTime: gameState.endTime,
        duration: gameState.duration,
        remainingTime: gameState.remainingTime,
        serverTime: gameState.serverTime
      }
    });
  } catch (error) {
    console.error("Erro ao buscar estado do jogo:", error);
    res.status(500).json({ error: "Erro interno ao buscar estado do jogo." });
  }
});

// GET /api/game/status - Retorna apenas status (mais leve)
router.get("/status", async (req, res) => {
  try {
    const status = await getGameStatus();
    res.status(200).json({
      success: true,
      status,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao buscar status do jogo:", error);
    res.status(500).json({ error: "Erro interno ao buscar status." });
  }
});

// GET /api/game/settings - Mantido para compatibilidade (deprecated)
// Agora redireciona para /state
router.get("/settings", async (req, res) => {
  try {
    const gameState = await getGameState();
    res.status(200).json({
      success: true,
      gameState,
      note: "Este endpoint está deprecated. Use /api/game/state"
    });
  } catch (error) {
    console.error("Erro ao buscar configurações do jogo:", error);
    res.status(500).json({ error: "Erro interno ao buscar configurações." });
  }
});

module.exports = router;
