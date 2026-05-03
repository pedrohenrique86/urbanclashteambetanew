const express = require("express");
const router = express.Router();
const actionLogService = require("../services/actionLogService");
const { authenticateToken } = require("../middleware/auth");

/**
 * GET /api/logs/me
 * Retorna o histórico recente de atividades da rede (Network Logs).
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await actionLogService.getRecentLogs(userId, 50);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    console.error(`[routes/logs] Error fetching logs for user ${req.user.id}:`, err);
    res.status(500).json({ error: "Erro interno ao processar registros da rede." });
  }
});

module.exports = router;
