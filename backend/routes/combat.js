const express = require("express");
const router = express.Router();
const { authenticateToken, requireMinLevel } = require("../middleware/auth");
const combatService = require("../services/combatService");

const { lockPlayerAction } = require("../middleware/lockMiddleware");

/**
 * @route GET /api/combat/radar
 * @desc Get nearby targets for PvP
 */
router.get("/radar", authenticateToken, requireMinLevel(10), async (req, res) => {
  try {
    const targets = await combatService.getRadarTargets(req.user.id);
    res.json(targets);
  } catch (error) {
    console.error("[combat/radar] ❌ Erro:", error.message, error.stack);
    // Erros de negócio (ex: nível insuficiente, estado não encontrado) → 400
    // Erros de infraestrutura (Redis/DB crash) → 500
    const isBusinessError = error.message?.includes("Acesso negado") 
      || error.message?.includes("estado de jogador")
      || error.message?.includes("nível 10");
    const status = isBusinessError ? 400 : 500;
    res.status(status).json({ error: error.message || "Erro interno ao carregar radar." });
  }
});

/**
 * @route GET /api/combat/precalc/:targetId
 * @desc Gives hint from Spectro and target context before confirming attack
 */
router.get("/precalc/:targetId", authenticateToken, requireMinLevel(10), async (req, res) => {
  try {
    const info = await combatService.getPreCombatStatus(req.user.id, req.params.targetId);
    res.json(info);
  } catch (error) {
    console.error("[combat/precalc] ❌ Erro:", error.message, error.stack);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/combat/attack/:targetId
 * @desc Execute the old strategic attack (Legacy)
 */
router.post("/attack/:targetId", authenticateToken, requireMinLevel(10), lockPlayerAction(1000), async (req, res) => {
  try {
    const { tactic } = req.body;
    const result = await combatService.executeAttack(req.user.id, req.params.targetId, tactic);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/combat/instant-attack/:targetId
 * @desc Executa o ataque no estilo The Crims (Instantâneo)
 */
router.post("/instant-attack/:targetId", authenticateToken, requireMinLevel(10), lockPlayerAction(1000), async (req, res) => {
  try {
    const result = await combatService.executeInstantAttack(req.user.id, req.params.targetId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/combat/active-start/:targetId
 * @desc Start Active Turn-based Combat
 */
router.post("/active-start/:targetId", authenticateToken, requireMinLevel(10), lockPlayerAction(1000), async (req, res) => {
  try {
    const state = await combatService.startActiveCombat(req.user.id, req.params.targetId);
    res.json(state);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/combat/active-turn
 * @desc Process a single turn
 */
router.post("/active-turn", authenticateToken, lockPlayerAction(500), async (req, res) => {
  try {
    const { action } = req.body;
    const result = await combatService.processActiveTurn(req.user.id, action);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
