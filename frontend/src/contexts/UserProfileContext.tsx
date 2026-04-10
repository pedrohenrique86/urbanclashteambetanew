import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { UserProfile } from "../types";
import { calculateLevel } from "../utils/leveling";

interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  handleLogout: () => Promise<void>;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined,
);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- Início do Padrão `trackedUserId` Corrigido ---
  const userId = user?.id ?? null;
  const [trackedUserId, setTrackedUserId] = useState(userId);

  // Passo 1: Detectar a mudança de ID durante a renderização.
  // O objetivo é definir `loading` como `true` de forma síncrona para evitar
  // que a UI renderize um estado inconsistente (usuário novo, perfil antigo).
  if (userId !== trackedUserId) {
    // Atualiza o ID que estamos rastreando e força o estado de carregamento.
    // Isso causa uma nova renderização imediata.
    setTrackedUserId(userId);
    setLoading(true);
  }
  // --- Fim do Padrão ---

  const processProfileData = useCallback(
    (profileData: any, user: any): UserProfile => {
      const levelInfo = calculateLevel(profileData.current_xp || 0);
      return {
        id: profileData.id ? profileData.id.toString() : profileData.user_id,
        user_id: profileData.user_id,
        email: user.email,
        is_admin: profileData.is_admin,
        faction: profileData.faction,
        clan_id: profileData.clan_id,
        username: (profileData.username || "Usuário").substring(0, 10),
        created_at: profileData.created_at,
        current_xp: profileData.current_xp,
        level: Number(profileData.level ?? levelInfo.level),
        xp_required: Number(
          profileData.xp_required ?? levelInfo.xpForNextLevel,
        ),
        resources: profileData.money,
        money: profileData.money,
        wins: profileData.victories,
        losses: profileData.defeats,
        victories: profileData.victories,
        defeats: profileData.defeats,
        streak: profileData.winning_streak,
        winning_streak: profileData.winning_streak,
        critical_damage: profileData.critical_damage,
        action_points: profileData.action_points,
        attack: profileData.attack,
        defense: profileData.defense,
        focus: profileData.focus,
        energy: profileData.energy,
        max_energy: profileData.max_energy,
        intimidation: profileData.intimidation,
        discipline: profileData.discipline,
      };
    },
    [],
  );

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    // O `loading` já foi definido como `true` na fase de renderização.
    try {
      const response = await api.get("/users/profile");
      const profileData = response.data;

      if (profileData) {
        const processed = processProfileData(profileData, user);
        setUserProfile(processed);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Erro ao buscar o perfil do usuário:", error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user, processProfileData]);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    await fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    await logout();
    setUserProfile(null);
    navigate("/");
  };

  // Passo 2: O `useEffect` que executa a busca de dados.
  useEffect(() => {
    // Se não há usuário, limpamos o perfil.
    if (!userId) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // A VERIFICAÇÃO CRÍTICA:
    // Só executamos o `fetchProfile` quando o `userId` da prop e o `trackedUserId`
    // do estado estiverem sincronizados. Isso previne a chamada na "renderização
    // intermediária" causada pela lógica síncrona acima.
    if (userId === trackedUserId) {
      fetchProfile();
    }
    // As dependências garantem que este efeito re-execute quando qualquer um
    // desses valores mudar, e a lógica interna previne a chamada duplicada.
  }, [userId, trackedUserId, fetchProfile]);

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        loading,
        refreshProfile,
        handleLogout,
        setUserProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error(
      "useUserProfileContext deve ser usado dentro de um UserProfileProvider",
    );
  }
  return context;
};
