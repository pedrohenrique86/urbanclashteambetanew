const express = require("express");
const router = express.Router();

// O módulo agora exporta uma função que recebe o cache
module.exports = ({ gameSettingsCache }) => {
  // Rota para obter as configurações do jogo (pública)
  // GET /api/game/settings
  router.get("/settings", async (req, res) => {
    try {
      // Retorna diretamente o conteúdo do cache
      res.status(200).json(gameSettingsCache);
    } catch (error) {
      console.error("Erro ao buscar configurações do jogo do cache:", error);
      res.status(500).json({ error: "Erro interno ao buscar configurações." });
    }
  });

  return router;
};
