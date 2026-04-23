import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import api from "../lib/api";
import { HUDCache } from "../hooks/useHUDCache";
import { usePlayerStateSSE, PlayerStatePayload } from "../hooks/usePlayerStateSSE";

export interface Faction {
  id: number;
  name: string;
  description: string;
  icon_url: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  faction: Faction | null;
  level: number;
  xp: number;
  energy: number;
  gold: number;
  gems: number;
  last_login_at: string;
  created_at: string;
  clan_id?: string;
  is_admin?: boolean;
  user_id?: string;
  current_xp?: number;
  resources?: number;
  wins?: number;
  losses?: number;
  streak?: number;
  winning_streak?: number;
  attack?: number;
  defense?: number;
  focus?: number;
  luck?: number;
  intimidation?: number;
  discipline?: number;
  crit_chance_pct?: number;
  crit_damage_mult?: number;
  max_energy?: number;
  xp_required?: number;
  action_points?: number;
  money?: number;
  status?: string;
  status_ends_at?: string | null;
  training_ends_at?: string | null;
  daily_training_count?: number;
  last_training_reset?: string;
  active_training_type?: string | null;
}

export interface IUserProfileContext {
  userProfile: UserProfile | null;
  loading: boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  refreshProfile: () => Promise<UserProfile | null>;
  processProfileData: (
    profileData: any,
    currentUser: any,
  ) => UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  handleLogout: () => void;
}

const UserProfileContext = createContext<IUserProfileContext | undefined>(
  undefined,
);

/**
 * Merge de um evento player:patch (SSE) no perfil React atual.
 * Atualiza APENAS os campos que o backend enviou no patch.
 */
function mergePlayerStateIntoProfile(
  prev: UserProfile | null,
  payload: PlayerStatePayload,
): UserProfile | null {
  if (!prev) return prev;
  // Payload agora é um patch: só processamos o que foi enviado
  const { patch } = payload;
  if (!patch) return prev;

  const next = { ...prev };

  if (patch.level !== undefined) next.level = patch.level;
  if (patch.xp !== undefined) {
    next.xp = patch.xp;
  }

  // SÊNIOR: Campos derivados injetados via Patch
  if (patch.currentXp !== undefined)  next.current_xp = patch.currentXp;
  if (patch.xpRequired !== undefined) next.xp_required = patch.xpRequired;

  if (patch.energy !== undefined) next.energy = patch.energy;
  if (patch.maxEnergy !== undefined) next.max_energy = patch.maxEnergy;
  if (patch.actionPoints !== undefined) next.action_points = patch.actionPoints;
  if (patch.attack !== undefined) next.attack = patch.attack;
  if (patch.defense !== undefined) next.defense = patch.defense;
  if (patch.focus !== undefined) next.focus = patch.focus;
  if (patch.luck !== undefined) next.luck = patch.luck;
  if (patch.critChance !== undefined) next.crit_chance_pct = patch.critChance;
  if (patch.critDamage !== undefined) next.crit_damage_mult = patch.critDamage;
  if (patch.cash !== undefined) next.money = patch.cash;
  if (patch.intimidation !== undefined) next.intimidation = patch.intimidation;
  if (patch.discipline !== undefined) next.discipline = patch.discipline;
  if (patch.victories !== undefined) next.wins = patch.victories;
  if (patch.defeats !== undefined) next.losses = patch.defeats;
  if (patch.winningStreak !== undefined) {
    next.streak         = patch.winningStreak;
    next.winning_streak = patch.winningStreak;
  }
 
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.statusEndsAt !== undefined) next.status_ends_at = patch.statusEndsAt;
  
  if (patch.trainingEndsAt !== undefined) next.training_ends_at = patch.trainingEndsAt;
  if (patch.dailyTrainingCount !== undefined) next.daily_training_count = patch.dailyTrainingCount;
  if (patch.lastTrainingReset !== undefined) next.last_training_reset = patch.lastTrainingReset;
  if (patch.activeTrainingType !== undefined) next.active_training_type = patch.activeTrainingType;

  return next;
}

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const isFetching = useRef(false);
  const cooldownUntil = useRef(0);
  const fetchedForUser = useRef<string | null>(null);

  const processProfileData = useCallback(
    (profileData: any, currentUser: any): UserProfile | null => {
      if (!profileData || !currentUser) return null;

      return {
        id: currentUser.id,
        username: profileData.username || currentUser.username,
        email: currentUser.email,
        faction: profileData.faction || null,
        level: profileData.level || 1,
        xp: profileData.total_xp || profileData.xp || 0,
        energy: profileData.energy || 100,
        gold: profileData.gold || 0,
        gems: profileData.gems || 0,
        last_login_at: profileData.last_login_at,
        created_at: profileData.created_at,
        clan_id: profileData.clan_id,
        is_admin: profileData.is_admin || false,

        attack: Number(profileData.attack) || 0,
        defense: Number(profileData.defense) || 0,
        focus: Number(profileData.focus) || 0,
        luck: Number(profileData.luck) || 0,
        intimidation: Number(profileData.intimidation) || 0,
        discipline: Number(profileData.discipline) || 0,
        crit_chance_pct: Number(profileData.crit_chance_pct) || 0,
        crit_damage_mult: Number(profileData.crit_damage_mult) || 0,
        max_energy: Number(profileData.max_energy) || 100,
        xp_required: Number(profileData.xp_required) || 0,
        action_points: Number(profileData.action_points) || 0,
        money: Number(profileData.money) || 0,

        user_id: currentUser.id,
        current_xp: Number(profileData.current_xp) || 0,
        resources: Number(profileData.gold) || 0,
        wins: Number(profileData.wins) || 0,
        losses: Number(profileData.losses) || 0,
        streak: Number(profileData.streak) || 0,
        status: profileData.status || 'Operacional',
        status_ends_at: profileData.status_ends_at || null,
        training_ends_at: profileData.training_ends_at || null,
        daily_training_count: Number(profileData.daily_training_count) || 0,
        last_training_reset: profileData.last_training_reset,
        active_training_type: profileData.active_training_type || null,
      };
    },
    [],
  );

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) {
      setUserProfile(null);
      fetchedForUser.current = null;
      return null;
    }

    if (isFetching.current) {
      if (import.meta.env.DEV) {
        console.debug("Busca de perfil já em andamento. Nova chamada ignorada.");
      }
      return userProfile;
    }

    if (Date.now() < cooldownUntil.current) {
      const remaining = Math.ceil((cooldownUntil.current - Date.now()) / 1000);
      console.warn(`API em cooldown. Tente novamente em ${remaining}s.`);
      return userProfile;
    }

    if (fetchedForUser.current === user.id) {
      return userProfile;
    }

    isFetching.current = true;
    setLoading(true);

    try {
      const response = await api.get("/users/profile");
      const profileData = response.data;

      if (profileData) {
        const processed = processProfileData(profileData, user);

        setUserProfile(processed);
        fetchedForUser.current = user.id;
        return processed;
      } else {
        setUserProfile(null);
        fetchedForUser.current = user.id;
        return null;
      }
    } catch (error: any) {
      console.error("Falha ao buscar perfil do usuário:", error);

      if (error.response) {
        switch (error.response.status) {
          case 429:
            console.warn("Muitas requisições. Tentando novamente em 10 segundos.");
            cooldownUntil.current = Date.now() + 10000;
            break;
          case 401:
            HUDCache.clear();
            await logout();
            navigate("/");
            break;
          case 404:
            setUserProfile(null);
            fetchedForUser.current = user.id;
            break;
        }
      }

      return null;
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logout, navigate, processProfileData]);

  useEffect(() => {
    fetchProfile();
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    fetchedForUser.current = null;
    return await fetchProfile();
  }, [fetchProfile]);

  const handleLogout = useCallback(() => {
    HUDCache.clear();
    logout().then(() => {
      navigate("/");
    });
  }, [logout, navigate]);

  // ─── SSE: canal privado de estado do jogador ─────────────────────────────────
  // Quando o backend emite player:state, atualiza o React state IMEDIATAMENTE
  // sem nenhuma chamada HTTP adicional.
  const handlePlayerStateUpdate = useCallback((payload: PlayerStatePayload) => {
    setUserProfile((prev) => mergePlayerStateIntoProfile(prev, payload));
  }, []);

  const handlePlayerStatusUpdate = useCallback((payload: { status: string; status_ends_at: string | null }) => {
    setUserProfile((prev) => prev ? {
      ...prev,
      status: payload.status,
      status_ends_at: payload.status_ends_at
    } : prev);
  }, []);

  usePlayerStateSSE({
    userId: user?.id ?? null,
    onStateUpdate: handlePlayerStateUpdate,
    onStatusUpdate: handlePlayerStatusUpdate,
  });
  // ───────────────────────────────────────────────────────────────────
  const isProfileLoading =
    loading || (user !== null && fetchedForUser.current !== user.id);

  const contextValue = useMemo(
    () => ({
      userProfile,
      loading: isProfileLoading,
      fetchProfile,
      refreshProfile,
      processProfileData,
      setUserProfile,
      handleLogout,
    }),
    [
      userProfile,
      isProfileLoading,
      fetchProfile,
      refreshProfile,
      processProfileData,
      handleLogout,
    ]
  );

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error(
      "useUserProfileContext must be used within a UserProfileProvider",
    );
  }
  return context;
};