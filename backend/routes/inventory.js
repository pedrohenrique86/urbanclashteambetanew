const express = require("express");
const router = express.Router();
const { authenticateToken, requireOperational } = require("../middleware/auth");
const inventoryService = require("../services/inventoryService");

/**
 * POST /api/inventory/equip
 * Equipar ou desequipar um item em um slot específico.
 * SÊNIOR: Validação de slot e atualização de bônus automática.
 */
router.post("/equip", authenticateToken, requireOperational, async (req, res) => {
  try {
    const { itemCode, slot } = req.body;
    
    if (!itemCode || !slot) {
      return res.status(400).json({ error: "ItemCode e Slot são obrigatórios." });
    }

    const result = await inventoryService.toggleEquip(req.user.id, itemCode, slot);
    
    res.json({
      success: true,
      message: result.equipped ? `Item ${itemCode} equipado no slot ${slot}.` : `Item ${itemCode} removido do slot ${slot}.`,
      ...result
    });
  } catch (error) {
    console.error("[Inventory Route Error]:", error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/inventory
 * Retorna o inventário completo com status de equipamento.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const inventory = await inventoryService.getInventory(req.user.id);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
