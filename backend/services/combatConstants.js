/**
 * combatConstants.js
 * 
 * Centraliza os dados estáticos e configurações do motor de combate.
 */

const CYBER_SETORS = [
  "Setor 7", "Beco Cromado", "Distrito Neon", "Periferia 404", "Mainframe Central", 
  "Vazio de Dados", "Submercado 9", "Torre de Cristal", "Nó de Segregação", 
  "Zona de Quarentena", "Porto Seco", "Viaduto Industrial", "Pátio de Sucata", 
  "Eixo Norte", "Quadrante Sombrio"
];

const CYBER_WEAPONS = [
  "Lâmina Térmica", "Canhão de Pulso", "Neural Linker", "Mono-molécula", 
  "Dreno de Energia", "Injetor de Vírus", "Sabre de Plasma", "Rifle de Gauss",
  "Adaga de Frequência", "Bastão Eletrificado", "Granada de Pulso EM",
  "Nervo Óptico Hackeado", "Exo-punho Hidráulico", "Lançador de Nanites", "Dispositivo de Sobrecarga"
];

const RENEGADO_BOT_NAMES = [
  "VandaLo_Ne0n", "Sombra_Ativ4", "Cr4ck_H3ad", "Ghost_Protocol", "Glitch_Stalker",
  "Rogue_Unit_01", "Cypher_Punk", "Void_Runner", "Chaos_Node", "Null_Pointer",
  "Static_Rebel", "Data_Thief", "Neural_Bandit", "Pixel_Wraith", "Overclock_Kid",
  "Broken_Link", "Night_Crawler", "Shadow_Script", "Hex_Ghost", "Zero_Day"
];

const GUARDIAO_BOT_NAMES = [
  "Sentinela_XV", "Pax_CorpHQ", "Vigilante_System", "Aegis_Prime", "Iron_Law",
  "Order_Enforcer", "Cyber_Shield", "PeaceKeeper_Alpha", "Guardian_Z", "Unity_Beacon",
  "System_Admin", "Protocol_X", "Core_Defender", "Nexus_Guard", "Vector_Prime",
  "Law_Giver", "Sentinel_Omega", "Avalaunch_Unit", "Grid_Keeper", "Secure_Shell"
];

module.exports = {
  CYBER_SETORS,
  CYBER_WEAPONS,
  RENEGADO_BOT_NAMES,
  GUARDIAO_BOT_NAMES,
  COMBAT_CONFIG: {
    RADAR_PVP_LIMIT: 5,
    RADAR_PVE_LIMIT: 5,
    RADAR_TOTAL_LIMIT: 10,
    RADAR_TTL: 18,
    LOCK_TTL: 15,
    COOLDOWN_TTL: 10,
    XP_WIN_BASE: 50
  }
};
