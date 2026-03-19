const express = require("express");
const router = express.Router();
const { query } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

// O módulo agora exporta uma função que recebe a função de atualização do cache
module.exports = ({ updateGameSettingsCache }) => {
  // Middleware para verificar se o usuário é o administrador
  const isAdmin = (req, res, next) => {
    if (req.user && req.user.is_admin) {
      next();
    } else {
      res
        .status(403)
        .json({ error: "Acesso negado. Somente administradores." });
    }
  };

  // Rota para AGENDAR o início do jogo
  router.post("/schedule", authenticateToken, isAdmin, async (req, res) => {
    const { startTime } = req.body;

    if (!startTime) {
      return res
        .status(400)
        .json({ error: "A data de início (startTime) é obrigatória." });
    }

    try {
      const result = await query(
        `INSERT INTO game_config (id, key, value)
         VALUES (1, 'game_start_time', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
         RETURNING *`,
        [startTime],
      );

      // Atualiza o cache imediatamente
      await updateGameSettingsCache();

      res.status(200).json({
        message: "Início do jogo agendado com sucesso!",
        config: result.rows[0],
      });
    } catch (error) {
      console.error("Erro ao agendar início do jogo:", error);
      res.status(500).json({ error: "Erro interno ao salvar a configuração." });
    }
  });

  // Rota para PARAR o tempo e resetar o agendamento
  router.post("/stop-time", authenticateToken, isAdmin, async (req, res) => {
    try {
      // Desativa a contagem regressiva
      await query(
        `INSERT INTO game_config (id, key, value)
         VALUES (2, 'is_countdown_active', 'false')
         ON CONFLICT (key) DO UPDATE SET value = 'false', updated_at = NOW()`,
      );

      // Remove o tempo de início agendado
      await query(`DELETE FROM game_config WHERE key = 'game_start_time'`);

      // Atualiza o cache imediatamente
      await updateGameSettingsCache();

      res.status(200).json({
        message: "Tempo parado e agendamento resetado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao parar o tempo:", error);
      res.status(500).json({ error: "Erro interno ao resetar o tempo." });
    }
  });

  return router;
};
