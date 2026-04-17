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
  attack?: number;
  defense?: number;
  focus?: number;
  max_energy?: number;
  xp_required?: number;
  action_points?: number;
  money?: number;
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
        xp: profileData.xp || 0,
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
        max_energy: Number(profileData.max_energy) || 100,
        xp_required: Number(profileData.xp_required) || 0,
        action_points: Number(profileData.action_points) || 0,
        money: Number(profileData.money) || 0,

        user_id: currentUser.id,
        current_xp: Number(profileData.xp) || 0,
        resources: Number(profileData.gold) || 0,
        wins: Number(profileData.wins) || 0,
        losses: Number(profileData.losses) || 0,
        streak: Number(profileData.streak) || 0,
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