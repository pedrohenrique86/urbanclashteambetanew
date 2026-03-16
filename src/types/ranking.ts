// Tipos para o sistema de ranking
export interface Player {
  id: string;
  username: string;
  level: number;
  faction: 'gangsters' | 'guardas';
  country?: string; // Campo opcional pois não está sendo retornado pela API
  current_xp: number;
  position?: number; // Posição no ranking
}

export interface Clan {
  id: string;
  name: string;
  faction: 'gangsters' | 'guardas';
  score: number;
  position?: number; // Posição no ranking
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