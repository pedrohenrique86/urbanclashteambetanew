import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import api from "../lib/api";

// (Interfaces UserProfile, IUserProfileContext, etc. permanecem as mesmas)
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
  // For compatibility with ranking.ts UserProfile
  user_id?: string;
  current_xp?: number;
  resources?: number;
  wins?: number;
  losses?: number;
  streak?: number;
  // Combat and other attributes
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

  // ========================================================================
  // PROTEÇÕES CONTRA LOOP INFINITO E CHAMADAS CONCORRENTES
  // Usamos useRef para manter o estado entre renders sem causar novas renderizações.
  // ========================================================================

  // PROTEÇÃO 1: Controle de busca ativa.
  // Impede que fetchProfile seja chamado se uma requisição já estiver em andamento.
  const isFetching = useRef(false);

  // PROTEÇÃO 2: Controle de cooldown para erro 429 (Too Many Requests).
  // Armazena o timestamp de quando poderemos tentar novamente.
  const cooldownUntil = useRef(0);

  // PROTEÇÃO 3: Controle de usuário já buscado.
  // Impede buscas repetidas para o mesmo usuário logado.
  const fetchedForUser = useRef<string | null>(null);

  const processProfileData = useCallback(
    (profileData: any, currentUser: any): UserProfile | null => {
      if (!profileData || !currentUser) return null;

      // Log para depuração: veja o que o backend está realmente enviando.
      console.log("Dados brutos do perfil recebidos:", profileData);

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

        // --- ATRIBUTOS DE COMBATE E OUTROS ---
        // Garante que os valores sejam numéricos, com fallback para 0.
        attack: Number(profileData.attack) || 0,
        defense: Number(profileData.defense) || 0,
        focus: Number(profileData.focus) || 0,
        max_energy: Number(profileData.max_energy) || 100,
        xp_required: Number(profileData.xp_required) || 0,
        action_points: Number(profileData.action_points) || 0,
        money: Number(profileData.money) || 0,

        // Campos de compatibilidade (se ainda forem necessários)
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
    // --- INÍCIO DAS VALIDAÇÕES DE SEGURANÇA ---

    // Se não há usuário, limpa o perfil e reseta os controles.
    if (!user) {
      setUserProfile(null);
      fetchedForUser.current = null;
      return null;
    }

    // Validação 1: Se já estamos buscando, não faz nada.
    if (isFetching.current) {
      console.warn("Busca de perfil já em andamento. Nova chamada ignorada.");
      return userProfile;
    }

    // Validação 2: Se estamos em cooldown por erro 429, não faz nada.
    if (Date.now() < cooldownUntil.current) {
      const remaining = Math.ceil((cooldownUntil.current - Date.now()) / 1000);
      console.warn(`API em cooldown. Tente novamente em ${remaining}s.`);
      return userProfile;
    }

    // Validação 3: Se já buscamos o perfil para o usuário atual, não faz nada.
    if (fetchedForUser.current === user.id) {
      return userProfile;
    }

    // --- FIM DAS VALIDAÇÕES ---

    // Todos os checks passaram. Inicia a busca.
    isFetching.current = true;
    setLoading(true);

    try {
      const response = await api.get("/users/profile");
      const profileData = response.data;

      if (profileData) {
        const processed = processProfileData(profileData, user);

        // Log para depuração: veja o perfil processado.
        console.log("Perfil processado:", processed);

        setUserProfile(processed);
        fetchedForUser.current = user.id; // Marca que a busca para este usuário foi concluída.
        return processed;
      } else {
        setUserProfile(null);
        fetchedForUser.current = user.id; // Marca mesmo se não houver perfil, para não tentar de novo.
        return null;
      }
    } catch (error: any) {
      console.error("Falha ao buscar perfil do usuário:", error);

      if (error.response) {
        switch (error.response.status) {
          // CASO CRÍTICO: 429 Too Many Requests
          case 429:
            console.warn(
              "Muitas requisições. Tentando novamente em 10 segundos.",
            );
            cooldownUntil.current = Date.now() + 10000; // Ativa cooldown de 10s.
            break;
          // Erro de autenticação, desloga o usuário.
          case 401:
            await logout();
            navigate("/");
            break;
          // Perfil não encontrado, estado normal para novos usuários.
          case 404:
            setUserProfile(null);
            fetchedForUser.current = user.id; // Marca para não buscar de novo.
            break;
        }
      }
      return null;
    } finally {
      // Libera o lock e o estado de loading, independentemente do resultado.
      isFetching.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logout, navigate, processProfileData]); // << DEPENDÊNCIA 'userProfile' REMOVIDA INTENCIONALMENTE PARA EVITAR LOOP

  // Efeito principal que dispara a busca de perfil.
  // A dependência [user] garante que ele só rode quando o usuário mudar (login/logout).
  // A lógica interna de fetchProfile (com os useRef) previne execuções desnecessárias.
  useEffect(() => {
    fetchProfile();
  }, [user, fetchProfile]);

  // Função para forçar a atualização, limpando o controle de "usuário já buscado".
  const refreshProfile = useCallback(async () => {
    console.log("Forçando atualização do perfil do usuário...");
    fetchedForUser.current = null; // Reseta o controle para permitir uma nova busca.
    return await fetchProfile();
  }, [fetchProfile]);

  const handleLogout = useCallback(() => {
    logout().then(() => {
      navigate("/");
    });
  }, [logout, navigate]);

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        loading,
        fetchProfile,
        refreshProfile,
        processProfileData,
        setUserProfile,
        handleLogout,
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
      "useUserProfileContext must be used within a UserProfileProvider",
    );
  }
  return context;
};