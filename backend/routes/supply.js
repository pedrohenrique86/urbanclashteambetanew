const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const supplyService = require("../services/supplyService");

// Comprar suprimento
router.post("/buy/:itemId", authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await supplyService.buySupply(req.user.id, itemId);
    res.json(result);
  } catch (error) {
    console.error("[Supply Error]:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
