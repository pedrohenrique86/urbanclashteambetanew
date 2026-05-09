const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const marketService = require("../services/marketService");

// Obter itens da Bolsa Sombria
router.get("/items", authenticateToken, async (req, res) => {
  try {
    const items = await marketService.getMarketItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comprar item
router.post("/buy", authenticateToken, async (req, res) => {
  try {
    const { itemCode, quantity } = req.body;
    const result = await marketService.buyItem(req.user.id, itemCode, quantity);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Vender item
router.post("/sell", authenticateToken, async (req, res) => {
  try {
    const { itemCode, quantity } = req.body;
    const result = await marketService.sellItem(req.user.id, itemCode, quantity);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
