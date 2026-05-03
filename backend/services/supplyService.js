const playerStateService = require("../services/playerStateService");

const SUPPLY_ITEMS = {
  cafe: {
    id: "cafe",
    energyGained: 15,
    costCash: 40,
    costAP: 150,
    toxicity: 2
  },
  sanduiche: {
    id: "sanduiche",
    energyGained: 40,
    costCash: 120,
    costAP: 350,
    toxicity: 5
  },
  marmita: {
    id: "marmita",
    energyGained: 65,
    costCash: 280,
    costAP: 600,
    toxicity: 8
  },
  banquete: {
    id: "banquete",
    energyGained: 90,
    costCash: 500,
    costAP: 1000,
    toxicity: 10
  },
  adrenalina: {
    id: "adrenalina",
    energyGained: 100,
    costCash: 850,
    costAP: 1500,
    toxicity: 12
  }
};

async function buySupply(userId, itemId) {
  const item = SUPPLY_ITEMS[itemId];
  if (!item) {
    throw new Error("Item de suprimento inválido.");
  }

  const profile = await playerStateService.getPlayerState(userId);
  if (!profile) {
    throw new Error("Perfil não encontrado.");
  }

  if (profile.status && profile.status !== 'Operacional') {
    throw new Error(`Sua unidade está em ${profile.status}. Consumo restrito.`);
  }

  if (Number(profile.money || 0) < item.costCash) {
    throw new Error("Dinheiro insuficiente.");
  }

  if (Number(profile.action_points || 0) < item.costAP) {
    throw new Error("PA insuficiente.");
  }

  const currentEnergy = Number(profile.energy || 0);
  const maxEnergy = Number(profile.max_energy || 100);

  if (currentEnergy >= maxEnergy) {
    throw new Error("Sua energia já está no máximo.");
  }

  // Calculate new energy ensuring it doesn't exceed max
  const energyToAdd = Math.min(item.energyGained, maxEnergy - currentEnergy);

  // Toxicity Random Chance Logic (Roleplay-driven poisoning)
  let willIntoxicate = false;
  const roll = Math.random();
  
  if (item.id === "cafe") willIntoxicate = roll < 0.20; // 20% chance
  else if (item.id === "sanduiche") willIntoxicate = roll < 0.70; // 70% chance (street food!)
  else if (item.id === "marmita") willIntoxicate = roll < 0.50; // 50% chance
  else if (item.id === "banquete") willIntoxicate = roll < 0.10; // 10% chance (gourmet quality)
  else if (item.id === "adrenalina") willIntoxicate = roll < 0.80; // 80% chance (chemical strike)

  const currentTox = Number(profile.toxicity || 0);
  let toxToAdd = 0;
  let finalTox = currentTox;

  if (willIntoxicate) {
    const rawFinalTox = currentTox + item.toxicity;
    finalTox = Math.min(100, rawFinalTox);
    toxToAdd = finalTox - currentTox;
  }

  // Apply basic updates
  const updates = {
    money: -item.costCash,
    action_points: -item.costAP,
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
