const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth.js");
const trainingService = require("../services/trainingService.js");

/**
 * @route POST /api/training/start
 * @desc Inicia uma sessão de treinamento
 */
router.post("/start", authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const result = await trainingService.startTraining(req.user.id, type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/training/complete
 * @desc Finaliza o treino e recebe recompensas
 */
router.post("/complete", authenticateToken, async (req, res) => {
  try {
    const result = await trainingService.completeTraining(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
