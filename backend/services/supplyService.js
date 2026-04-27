const playerStateService = require("../services/playerStateService");

const SUPPLY_ITEMS = {
  cafe: {
    id: "cafe",
    energyGained: 15,
    costCash: 40,
    costAP: 150
  },
  sanduiche: {
    id: "sanduiche",
    energyGained: 40,
    costCash: 120,
    costAP: 350
  },
  marmita: {
    id: "marmita",
    energyGained: 65,
    costCash: 280,
    costAP: 600
  },
  banquete: {
    id: "banquete",
    energyGained: 90,
    costCash: 500,
    costAP: 1000
  },
  adrenalina: {
    id: "adrenalina",
    energyGained: 100,
    costCash: 850,
    costAP: 1500
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

  // Apply updates
  const updates = {
    money: -item.costCash,
    action_points: -item.costAP,
    energy: energyToAdd
  };

  await playerStateService.updatePlayerState(userId, updates);

  return {
    message: "Consumo detectado. Níveis de energia restaurados.",
    item,
    gainedEnergy: energyToAdd
  };
}

module.exports = {
  buySupply,
  SUPPLY_ITEMS
};
