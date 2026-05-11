import { UserProfile } from '../types';

// Mapa de compatibilidade para aceitar renegados/guardioes vindos do backend
// e normalizar para o frontend que espera gangsters/guardas.
export const FACTION_ALIAS_MAP_FRONTEND: Record<string, 'gangsters' | 'guardas'> = {
  gangsters: 'gangsters',
  gangster: 'gangsters',
  renegados: 'gangsters',
  renegado: 'gangsters',
  guardas: 'guardas',
  guarda: 'guardas',
  guardioes: 'guardas',
  guardiao: 'guardas',
  'guardiões': 'guardas',
  'guardião': 'guardas',
};

/**
 * Retorna a classe de cor correspondente à facção para nomes de usuários.
 * Gangsters/Renegados: Laranja Claro
 * Guardas/Guardiões: Azul Claro
 */
export const getFactionColor = (faction?: string) => {
  const f = (faction || "").toLowerCase().trim();
  const canonical = FACTION_ALIAS_MAP_FRONTEND[f] || f;
  
  if (canonical === 'gangsters') {
    return 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]';
  }
  if (canonical === 'guardas') {
    return 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]';
  }
  return 'text-slate-400';
};

// Função para verificar se uma data é mais antiga que 24 horas
export const isMoreThan24HoursAgo = (date: Date): boolean => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return diffInHours >= 24;
};

// Função para obter valores padrão baseados na facção
export const getDefaultStatsByFaction = (faction: string) => {
  const factionDefaults = {
    gangsters: {
      attack: 8,
      defense: 3,
      focus: 5,
      intimidation: 35.0,
      discipline: 0.0,
      critical_damage: 10.5, // Ataque + (Foco ÷ 2) = 8 + (5/2) = 10.5
      critical_chance: 10.0, // Foco × 2 = 5 × 2 = 10%
      energy: 100,
      max_energy: 100,
      action_points: 20000,
      money: 1000,
      victories: 0,
      defeats: 0,
      winning_streak: 0
    },
    guardas: {
      attack: 5,
      defense: 6,
      focus: 6,
      intimidation: 0.0,
      discipline: 40.0,
      critical_damage: 8.0, // Ataque + (Foco ÷ 2) = 5 + (6/2) = 8.0
      critical_chance: 12.0, // Foco × 2 = 6 × 2 = 12%
      energy: 100,
      max_energy: 100,
      action_points: 20000,
      money: 1000,
      victories: 0,
      defeats: 0,
      winning_streak: 0
    },

  };

  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[faction?.toLowerCase().trim()] || faction;

  if (canonicalFaction === 'gangsters') {
    return {
      level: 1,
      ...factionDefaults.gangsters
    };
  } else if (canonicalFaction === 'guardas') {
    return {
      level: 1,
      current_xp: 0,
      ...factionDefaults.guardas
    };
  }
  
  // Retorna null se a facção não for reconhecida
  return null;
};

// Função para aplicar configurações padrão baseadas na facção
// Modificada para não fazer nada, mantendo apenas os valores do banco de dados
export const applyFactionDefaults = async (userProfile: UserProfile) => {
  // Não aplicamos mais valores padrão para evitar oscilação
  // Mantemos apenas os valores que já estão no banco de dados
  if (!userProfile || !userProfile.faction) return;
  
  console.log(`Mantendo valores do banco de dados para facção: ${userProfile.faction}`);
  return;
};