const express = require("express");
const router = express.Router();
const { query } = require("../config/database");

// Rota para obter as configurações do jogo (pública)
// GET /api/game/settings
router.get("/settings", async (req, res) => {
  try {
    const result = await query("SELECT key, value FROM game_config");

    // Transforma o array de resultados em um objeto mais fácil de usar
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // Converte o valor de 'is_countdown_active' para booleano
    if (settings.is_countdown_active !== undefined) {
      settings.is_countdown_active = settings.is_countdown_active === "true";
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações do jogo:", error);
    res.status(500).json({ error: "Erro interno ao buscar configurações." });
  }
});

module.exports = router;
