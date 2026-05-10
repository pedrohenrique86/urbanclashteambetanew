const express = require("express");
const router = express.Router();
const contractService = require("../services/contractService");
const { authenticateToken } = require("../middleware/auth");
const { lockPlayerAction } = require("../middleware/lockMiddleware");

router.use(authenticateToken);

/**
 * Retorna as configurações (tipos de roubos e tarefas).
 */
router.get("/config", async (req, res) => {
  try {
    const { HEIST_TYPES, DAILY_SPECIAL, GUARDIAN_TYPES } = require("../utils/contractConstants");
    const playerStateService = require("../services/playerStateService");
    
    const state = await playerStateService.getPlayerState(req.user.id);
    const dynamicDaily = state ? contractService.getDynamicDailySpecial(state.level) : DAILY_SPECIAL;

    res.json({
      heists: HEIST_TYPES,
      dailySpecial: dynamicDaily,
      guardianTasks: GUARDIAN_TYPES
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Retorna o estado atual dos contratos para o usuário.
 */
  router.get("/status", async (req, res) => {
  try {
    const logs = await contractService.getLogs();
    
    res.json({
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Renegado: Realiza um roubo.
 * SÊNIOR: lockPlayerAction(500) impede cliques duplos ultra-rápidos.
 */
router.post("/heist", lockPlayerAction(500), async (req, res) => {
  try {
    const { heistId } = req.body;
    const result = await contractService.performHeist(req.user.id, heistId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Guardião: Realiza uma tarefa.
 */
router.post("/guardian-task", lockPlayerAction(500), async (req, res) => {
  try {
    const { taskId } = req.body;
    const result = await contractService.performGuardianTask(req.user.id, taskId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Guardião: Resolve interceptação pendente.
 */
router.post("/resolve-interception", lockPlayerAction(800), async (req, res) => {
  try {
    const { action } = req.body;
    const result = await contractService.resolveInterception(req.user.id, action);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
