const express = require("express");
const router = express.Router();
const { 
  stopGame, 
  pauseGame, 
  scheduleGame,
  getGameState 
} = require("../services/gameStateService");
const { authenticateToken } = require("../middleware/auth");

// Middleware para verificar se o usuário é administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: "Acesso negado. Somente administradores." });
  }
};

// GET /api/admin/game-state - Retorna estado atual do jogo
router.get("/game-state", authenticateToken, isAdmin, async (req, res) => {
  try {
    const gameState = await getGameState();
    res.json({ success: true, gameState });
  } catch (error) {
    console.error("Erro ao buscar estado do jogo:", error);
    res.status(500).json({ error: "Erro ao buscar estado do jogo" });
  }
});

// POST /api/admin/schedule - Agenda início do jogo (futuro)
router.post("/schedule", authenticateToken, isAdmin, async (req, res) => {
  const { startTime, duration } = req.body;

  if (!startTime) {
    return res.status(400).json({ error: "A data de início (startTime) é obrigatória." });
  }

  try {
    // Duração padrão: 20 dias em segundos
    const durationSeconds = duration || (20 * 24 * 60 * 60);
    
    // Usa scheduleGame (não ativa imediatamente - aguarda auto-start)
    const result = await scheduleGame(startTime, durationSeconds);
    
    res.status(200).json({
      success: true,
      message: "Jogo agendado com sucesso! Iniciará automaticamente no horário definido.",
      gameState: result
    });
  } catch (error) {
    console.error("Erro ao agendar jogo:", error);
    res.status(500).json({ error: "Erro interno ao salvar a configuração." });
  }
});

// POST /api/admin/stop-time - Para o jogo
router.post("/stop-time", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await stopGame();
    
    res.status(200).json({
      success: true,
      message: "Jogo parado e agendamento resetado com sucesso!",
      gameState: result
    });
  } catch (error) {
    console.error("Erro ao parar o jogo:", error);
    res.status(500).json({ error: "Erro interno ao resetar o jogo." });
  }
});

// POST /api/admin/pause - Pausa/despausa o jogo
router.post("/pause", authenticateToken, isAdmin, async (req, res) => {
  const { paused } = req.body;
  
  try {
    const result = await pauseGame(paused !== false);
    
    res.status(200).json({
      success: true,
      message: result.message,
      gameState: result
    });
  } catch (error) {
    console.error("Erro ao pausar/despausar jogo:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/admin/set-player-status - Altera status de qualquer jogador (Override)
router.post("/set-player-status", authenticateToken, isAdmin, async (req, res) => {
  const { userId, username, status, duration } = req.body;
  
  try {
    const { query } = require("../config/database");
    let targetId = userId;

    // Se passou username, resolve para ID
    if (!targetId && username) {
      const result = await query("SELECT id FROM users WHERE username = $1", [username]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });
      targetId = result.rows[0].id;
    }

    if (!targetId || !status) {
      return res.status(400).json({ error: "userId/username e status são obrigatórios." });
    }

    const playerStateService = require("../services/playerStateService");
    const newState = await playerStateService.setPlayerStatus(targetId, status, duration || null);
    
    res.json({
      success: true,
      message: `Status de ${username || targetId} alterado para ${status}.`,
      state: newState
    });
  } catch (error) {
    console.error("Erro ao alterar status via Admin:", error.message);
    res.status(500).json({ error: error.message || "Erro ao alterar status." });
  }
});

module.exports = router;