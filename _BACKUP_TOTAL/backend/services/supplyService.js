const playerStateService = require("../services/playerStateService");
const actionLogService = require("../services/actionLogService");

const SUPPLY_ITEMS = {
  cafe: {
    id: "cafe",
    energyGained: 15,
    costCash: 40,
    costAP: 50,
    toxicity: 2
  },
  sanduiche: {
    id: "sanduiche",
    energyGained: 40,
    costCash: 120,
    costAP: 120,
    toxicity: 5
  },
  marmita: {
    id: "marmita",
    energyGained: 65,
    costCash: 280,
    costAP: 250,
    toxicity: 8
  },
  banquete: {
    id: "banquete",
    energyGained: 90,
    costCash: 500,
    costAP: 400,
    toxicity: 10
  },
  adrenalina: {
    id: "adrenalina",
    energyGained: 100,
    costCash: 850,
    costAP: 600,
    toxicity: 12
  }
};

async function buySupply(userId, itemId, isFieldBuy = false) {
  let item = SUPPLY_ITEMS[itemId];
  
  // Caso Especial: Recarga Total via Fast Food nos Contratos
  if (itemId === 'full_refill') {
    item = {
      id: "full_refill",
      energyGained: 100, // Será recalculado dinamicamente
      costCash: 1600,
      costAP: 600,
      toxicity: 15
    };
  }

  if (!item) {
    throw new Error("Item de suprimento inválido.");
  }

  const profile = await playerStateService.getPlayerState(userId);
  if (!profile) {
    throw new Error("Perfil não encontrado.");
  }

  const currentTox = Number(profile.toxicity || 0);
  const toxicityMultiplier = 1 + (currentTox / 250);
  
  // Multiplicador de Campo (Apenas para itens da loja comprados fora)
  // O 'full_refill' já tem custo premium embutido
  const fieldMultiplier = (isFieldBuy && itemId !== 'full_refill') ? 1.5 : 1.0;
  
  const dynamicCostCash = Math.floor(item.costCash * toxicityMultiplier * fieldMultiplier);
  const staticCostAP = item.costAP;

  if (profile.status && profile.status !== 'Operacional') {
    throw new Error(`Sua unidade está em ${profile.status}. Consumo restrito.`);
  }

  if (Number(profile.money || 0) < dynamicCostCash) {
    throw new Error(`Dinheiro insuficiente. Custo total: $${dynamicCostCash}.`);
  }

  if (Number(profile.action_points || 0) < staticCostAP) {
    throw new Error(`PA insuficiente. Requer ${staticCostAP} PA.`);
  }

  const currentEnergy = Number(profile.energy || 0);
  const maxEnergy = Number(profile.max_energy || 100);

  if (currentEnergy >= maxEnergy) {
    throw new Error("Sua energia já está no máximo.");
  }

  // Recarga Total: Garante que encha tudo
  const energyToAdd = itemId === 'full_refill' ? (maxEnergy - currentEnergy) : Math.min(item.energyGained, maxEnergy - currentEnergy);

  // Toxicity Logic
  let toxToAdd = 0;
  let finalTox = currentTox;

  // full_refill sempre adiciona toxicidade (taxa de conveniência biológica)
  if (itemId === 'full_refill' || Math.random() < (item.id === "cafe" ? 0.2 : item.id === "sanduiche" ? 0.4 : item.id === "marmita" ? 0.35 : 0.45)) {
    finalTox = Math.min(100, currentTox + item.toxicity);
    toxToAdd = finalTox - currentTox;
  }

  const updates = {
    money: -dynamicCostCash,
    action_points: -staticCostAP,
    energy: energyToAdd,
    toxicity: toxToAdd
  };

  let collapsed = false;

  // Collapse Check (Tiered risk based on toxicity zones)
  if (finalTox >= 85) {
    const chance = finalTox >= 91 ? 0.20 : 0.05; 
    const isCollapse = Math.random() < chance;
    
    if (isCollapse) {
      collapsed = true;
      updates.status = "Recondicionamento";
      updates.status_ends_at = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    }
  }

  // Update and Persist immediately to avoid "refresh bugs"
  // SÊNIOR: Forçamos a persistência imediata para ações de consumo (Food/Supplies)
  // para garantir que um F5 instantâneo não resulte em rollback se o cluster Redis oscilar.
  const newState = await playerStateService.updatePlayerState(userId, updates);

  // REGISTRO DE LOG - SÊNIOR: Desativado a pedido do usuário para evitar poluição visual 
  // e focar apenas em eventos macro (Combates/Treinos). 
  /*
  actionLogService.log(userId, "supply", "item", itemId, {
    energy_gained: energyToAdd,
    toxicity_added: toxToAdd,
    collapsed: collapsed
  });
  */

  if (collapsed) {
    return {
      message: "ALERTA CRÍTICO: Sobrecarga Torácica! Unidade entrou em Recondicionamento de emergência (20min).",
      item,
      gainedEnergy: energyToAdd,
      collapsed: true
    };
  }

  return {
    message: "Consumo detectado. Níveis de energia restaurados.",
    item,
    gainedEnergy: energyToAdd,
    collapsed: false
  };
}

async function buyAntidote(userId) {
  const profile = await playerStateService.getPlayerState(userId);
  if (!profile) {
    throw new Error("Perfil não encontrado.");
  }

  const currentTox = Math.floor(Number(profile.toxicity || 0));
  if (currentTox <= 0) {
    throw new Error("Sua toxicidade já está zerada.");
  }

  const level = Number(profile.level || 1);
  const costCash = Math.floor(100 + (level * 10) + (currentTox * 5 * (1 + level / 10)));
  
  if (Number(profile.money || 0) < costCash) {
    throw new Error(`Dinheiro insuficiente. O antídoto custa $${costCash}.`);
  }

  const updates = {
    money: -costCash,
    toxicity: -currentTox
  };

  await playerStateService.updatePlayerState(userId, updates);

  // REGISTRO DE LOG
  actionLogService.log(userId, "poison_clear", "antidote", "purificar_sistema", {
    cost_cash: costCash,
    toxicity_cleared: currentTox
  });

  return {
    message: "Sistema purgado. Toxicidade zerada com sucesso.",
    costCash,
    clearedToxicity: currentTox
  };
}

module.exports = {
  buySupply,
  buyAntidote,
  SUPPLY_ITEMS
};
