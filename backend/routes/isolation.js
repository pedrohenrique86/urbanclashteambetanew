const express = require("express");
const router = express.Router();
const isolationService = require("../services/isolationService");
const { authenticateToken } = require("../middleware/auth");

// Subornar o governante (Dinheiro dinâmico)
router.post("/bribe", authenticateToken, async (req, res) => {
  try {
    const result = await isolationService.bribeRuler(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Sair na hora (10 U-CRYPTON TOKENS)
router.post("/instant-escape", authenticateToken, async (req, res) => {
  try {
    const result = await isolationService.instantEscape(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tirar aliado do isolamento (10 U-CRYPTON TOKENS)
router.post("/help-ally", authenticateToken, async (req, res) => {
  try {
    const { allyId } = req.body;
    if (!allyId) return res.status(400).json({ message: "ID do aliado não fornecido." });
    
    const result = await isolationService.helpAlly(req.user.id, allyId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Listar aliados no isolamento
router.get("/allies", authenticateToken, async (req, res) => {
  try {
    const allies = await isolationService.getAlliesInIsolation(req.user.id);
    res.json(allies);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
