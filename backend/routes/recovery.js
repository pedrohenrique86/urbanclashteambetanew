const express = require("express");
const router = express.Router();
const recoveryService = require("../services/recoveryService");
const { authenticateToken } = require("../middleware/auth");

// Aplicar antídoto (1 U-CRYPTON TOKENS)
router.post("/antidote", authenticateToken, async (req, res) => {
  try {
    const result = await recoveryService.buyAntidote(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Resgatar aliado (5 U-CRYPTON TOKENS)
router.post("/rescue-ally", authenticateToken, async (req, res) => {
  try {
    const { allyId } = req.body;
    if (!allyId) return res.status(400).json({ message: "ID do aliado não fornecido." });
    
    const result = await recoveryService.rescueAlly(req.user.id, allyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Listar aliados em recondicionamento
router.get("/allies", authenticateToken, async (req, res) => {
  try {
    const allies = await recoveryService.getAlliesInReconditioning(req.user.id);
    res.json(allies);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
