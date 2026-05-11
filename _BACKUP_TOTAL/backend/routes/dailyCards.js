const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const dailyCardService = require("../services/dailyCardService");

const router = express.Router();

// GET /api/daily-cards - Obtém as opções do dia
router.get("/", authenticateToken, async (req, res) => {
  try {
    const options = await dailyCardService.getDailyOptions(req.user.id);
    res.json(options);
  } catch (error) {
    console.error("❌ Erro ao obter cartas diárias:", error.message);
    res.status(500).json({ error: "Erro interno ao processar cartas diárias." });
  }
});

// POST /api/daily-cards/choose - Escolhe uma carta
router.post("/choose", authenticateToken, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const result = await dailyCardService.chooseCard(req.user.id, optionIndex);
    res.json(result);
  } catch (error) {
    console.error("❌ Erro ao escolher carta diária:", error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
