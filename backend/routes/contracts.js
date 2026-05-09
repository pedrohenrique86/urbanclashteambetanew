const express = require("express");
const router = express.Router();
const contractService = require("../services/contractService");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

/**
 * Retorna o estado atual dos contratos para o usuário.
 */
router.get("/status", async (req, res) => {
  try {
    const activeContract = await contractService.getActiveContract(req.user.id);
    const districts = await contractService.getDistricts();
    const logs = await contractService.getLogs();
    const activeHeists = await contractService.getActiveHeists();
    
    res.json({
      activeContract,
      districts,
      logs,
      activeHeists
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Renegado: Realiza tarefa de preparação.
 */
router.post("/prepare", async (req, res) => {
  try {
    const { taskId, territoryId } = req.body;
    const result = await contractService.prepareTask(req.user.id, taskId, territoryId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Renegado: Inicia execução do roubo.
 */
router.post("/execute", async (req, res) => {
  try {
    const result = await contractService.executeHeist(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Renegado: Resolve o roubo após o timer.
 */
router.post("/resolve", async (req, res) => {
  try {
    const result = await contractService.resolveHeist(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Guardião: Realiza ação de ronda/investigação.
 */
router.post("/guardian-action", async (req, res) => {
  try {
    const { actionId } = req.body;
    const result = await contractService.guardianAction(req.user.id, actionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/intercept", async (req, res) => {
  try {
    const { contractId } = req.body;
    const result = await contractService.interceptHeist(req.user.id, contractId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
