const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

// Middleware para verificar se o usuário é o administrador
const isAdmin = (req, res, next) => {
  // O middleware authenticateToken já colocou os dados do usuário em req.user
  if (req.user && req.user.is_admin) {
    next(); // Se for o admin, continua para a próxima função
  } else {
    res.status(403).json({ error: "Acesso negado. Somente administradores." });
  }
};

// Rota para AGENDAR o início do jogo
// POST /api/admin/schedule
router.post("/schedule", authenticateToken, isAdmin, async (req, res) => {
  const { startTime } = req.body; // Ex: "2026-04-01T00:00:00.000Z"

  if (!startTime) {
    return res
      .status(400)
      .json({ error: "A data de início (startTime) é obrigatória." });
  }

  try {
    // Usamos ON CONFLICT para criar ou atualizar a configuração
    const result = await query(
      `INSERT INTO game_config (id, key, value)
       VALUES (1, 'game_start_time', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
       RETURNING *`,
      [startTime],
    );
    res.status(200).json({
      message: "Início do jogo agendado com sucesso!",
      config: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao agendar início do jogo:", error);
    res.status(500).json({ error: "Erro interno ao salvar a configuração." });
  }
});

// Rota para PAUSAR/RETOMAR a contagem
// POST /api/admin/toggle-countdown
router.post(
  "/toggle-countdown",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { active } = req.body; // true ou false

    if (typeof active !== "boolean") {
      return res
        .status(400)
        .json({ error: 'O estado "active" é obrigatório.' });
    }

    try {
      const result = await query(
        `INSERT INTO game_config (id, key, value)
       VALUES (2, 'is_countdown_active', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
       RETURNING *`,
        [active.toString()], // Armazenamos como texto 'true' ou 'false'
      );
      res.status(200).json({
        message: `Contagem ${active ? "ativada" : "pausada"}.`,
        config: result.rows[0],
      });
    } catch (error) {
      console.error("Erro ao alterar estado da contagem:", error);
      res.status(500).json({ error: "Erro interno ao salvar a configuração." });
    }
  },
);

module.exports = router;
