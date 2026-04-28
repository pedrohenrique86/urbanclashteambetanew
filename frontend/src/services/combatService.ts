import api from "../lib/api";

export interface RadarTarget {
  id: string;
  level: number;
  faction: string;
  name: string;
  online: boolean;
}

export interface PreCombatInfo {
  spectroHint: string;
  targetInfo: {
    level: number;
    faction: string;
    name: string;
  };
}

export interface CombatLoot {
  xp: number;
  money?: number;
  tax?: number;
  stats?: {
    attack: number;
    defense: number;
    focus: number;
  };
  moneyLost?: number;
  status?: string;
  energyLost?: number;
}

/** Resultado possível de um combate 1x1 */
export type CombatOutcome = "win" | "loss" | "draw_dko" | "draw_flee";

export interface CombatResult {
  /** Tipo de resultado: vitória, derrota ou um dos dois tipos de empate */
  outcome: CombatOutcome;
  /** Retrocompatibilidade: true apenas quando outcome === 'win' */
  winner: boolean;
  log: string[];
  loot: CombatLoot;
  targetRealName: string;
  spectroComment: string;
}

export const combatService = {
  getRadarTokens: async (): Promise<RadarTarget[]> => {
    const { data } = await api.get("/combat/radar");
    return data;
  },

  getPreCalc: async (targetId: string): Promise<PreCombatInfo> => {
    const { data } = await api.get(`/combat/precalc/${targetId}`);
    return data;
  },

  attack: async (targetId: string): Promise<CombatResult> => {
    const { data } = await api.post(`/combat/attack/${targetId}`);
    return data;
  }
};
