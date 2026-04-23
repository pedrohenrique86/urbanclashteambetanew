// Tipos para o sistema de ranking
export interface Player {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  faction: "gangsters" | "guardas";
  country?: string;
  current_xp: number;
  position?: number;
  clan_name?: string;
  status?: string;
  status_ends_at?: string | null;
}

export interface Clan {
  id: string;
  name: string;
  faction: "gangsters" | "guardas";
  score: number;
  position?: number;
  memberCount: number;
  leaderName: string;
}

// Tipos para o perfil do usuário
export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  email?: string; // Adicionado para verificação de admin
  is_admin?: boolean; // Adicionado para verificação de admin
  level: number;
  current_xp: number;
  xp_required?: number;
  faction: 'gangsters' | 'guardas';
  clan_id?: string;
  resources: number;
  money?: number;
  wins: number;
  losses: number;
  streak: number;
  victories?: number;
  defeats?: number;
  winning_streak?: number;
  health?: number;
  energy: number;
  max_energy?: number;
  strength?: number;
  defense: number;
  speed?: number;
  intelligence?: number;
  charisma?: number;
  intimidation?: number;
  discipline?: number;
  action_points?: number;
  attack?: number;
  focus?: number;
  luck?: number;
  critical_damage?: number;
  created_at?: string;
  updated_at?: string;
}

// Tipos para atividades
export interface Activity {
  id: string | number;
  type?: string;
  description?: string;
  activity?: string;
  timestamp?: string;
  time?: string;
  user_id?: string;
  clan_id?: string;
}