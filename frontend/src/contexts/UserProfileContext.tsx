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
import { socketService } from "../services/socketService";

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
  ucrypto?: number;
  victories?: number;
  defeats?: number;
  winning_streak?: number;
  attack?: number;
  defense?: number;
  focus?: number;
  luck?: number;
  intimidation?: number;
  discipline?: number;
  crit_chance_pct?: number;
  crit_damage_mult?: number;
  critical_chance?: number;
  critical_damage?: number;
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
  pending_training_toast?: any;
  toxicity?: number;
  avatar_url?: string;
  bio?: string;
  merit?: number;
  corruption?: number;
  active_chips?: Array<{
    name: string;
    power_boost: number;
    xp_boost: number;
    money_shield: number;
  }>;
  pending_interception?: {
    targetId: string;
    targetName: string;
    heistName: string;
    items: Array<{ code: string; quantity: number }>;
  } | null;
  inventory?: any[];
}

export interface IUserProfileContext {
  userProfile: UserProfile | null;
  loading: boolean;
  isError: boolean;
  fetchProfile: () => Promise<UserProfile | null>;
  refreshProfile: (force?: boolean) => Promise<UserProfile | null>;
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
  if (patch.victories !== undefined) next.victories = patch.victories;
  if (patch.defeats !== undefined) next.defeats = patch.defeats;
  if (patch.winningStreak !== undefined) next.winning_streak = patch.winningStreak;
 
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.statusEndsAt !== undefined) next.status_ends_at = patch.statusEndsAt;
  
  if (patch.trainingEndsAt !== undefined) next.training_ends_at = patch.trainingEndsAt;
  if (patch.dailyTrainingCount !== undefined) next.daily_training_count = patch.dailyTrainingCount;
  if (patch.lastTrainingReset !== undefined) next.last_training_reset = patch.lastTrainingReset;
  if (patch.activeTrainingType !== undefined) next.active_training_type = patch.activeTrainingType;
  if (patch.pending_training_toast !== undefined) next.pending_training_toast = patch.pending_training_toast;
  if (patch.toxicity !== undefined) next.toxicity = patch.toxicity;
  if (patch.bio !== undefined) next.bio = patch.bio;
  if (patch.avatar_url !== undefined) next.avatar_url = patch.avatar_url;
  if (patch.uCrypto !== undefined) next.ucrypto = patch.uCrypto;
  if (patch.merit !== undefined) next.merit = patch.merit;
  if (patch.corruption !== undefined) next.corruption = patch.corruption;
  if (patch.pendingInterception !== undefined) next.pending_interception = patch.pendingInterception;
  
  return next;
}

// ─── Cache helpers (localStorage) ─────────────────────────────────────────
const PROFILE_CACHE_KEY = "uc_profile_cache";

function readProfileCache(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeProfileCache(profile: UserProfile | null): void {
  try {
    if (profile) {
      // Não persiste dados voláteis de sessão (toast pendente)
      const { pending_training_toast: _, ...toStore } = profile;
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(toStore));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch { /* quota exceeded — ignora silenciosamente */ }
}
// ────────────────────────────────────────────────────────────────────────────

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Inicializa com o cache do localStorage — exibe sidebar instantaneamente no F5
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => readProfileCache());
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const isFetching = useRef(false);
  const cooldownUntil = useRef(0);
  const fetchedForUser = useRef<string | null>(null);
  // SÊNIOR: Timestamp da última atualização recebida via SSE.
  // Usado para evitar que um fetch HTTP subsequente sobrescreva estado correto
  // com dados stale do banco (debounce de 3s ainda não persistiu).
  const lastSSEUpdateRef = useRef<number>(0);
  const SSE_FRESHNESS_WINDOW_MS = 4000; // 4s > debounce de 3s do backend

  const processProfileData = useCallback(
    (profileData: any, currentUser: any): UserProfile | null => {
      if (!profileData || !currentUser) return null;

      const level = Number(profileData.level) || 1;
      
      // SÊNIOR: Fallback para xp_required caso o backend não tenha retornado (ex: no momento da criação)
      const xp_required = Number(profileData.xp_required) || (100 + (Math.floor(level / 5) * 10));

      return {
        id: currentUser.id,
        username: profileData.username || currentUser.username,
        email: currentUser.email,
        faction: profileData.faction || null,
        level: level,
        xp: profileData.total_xp || profileData.xp || 0,
        energy: profileData.energy !== undefined ? Number(profileData.energy) : 100,
        gold: profileData.gold !== undefined ? Number(profileData.gold) : 0,
        gems: profileData.gems !== undefined ? Number(profileData.gems) : 0,
        last_login_at: profileData.last_login_at,
        created_at: profileData.created_at,
        clan_id: profileData.clan_id,
        is_admin: profileData.is_admin || false,

        attack: profileData.attack !== undefined ? Number(profileData.attack) : 0,
        defense: profileData.defense !== undefined ? Number(profileData.defense) : 0,
        focus: profileData.focus !== undefined ? Number(profileData.focus) : 0,
        luck: profileData.luck !== undefined ? Number(profileData.luck) : 0,
        intimidation: profileData.intimidation !== undefined ? Number(profileData.intimidation) : 0,
        discipline: profileData.discipline !== undefined ? Number(profileData.discipline) : 0,
        critical_chance: profileData.critical_chance !== undefined ? Number(profileData.critical_chance) : 0,
        critical_damage: profileData.critical_damage !== undefined ? Number(profileData.critical_damage) : 0,
        crit_chance_pct: profileData.crit_chance_pct !== undefined ? Number(profileData.crit_chance_pct) : 0,
        crit_damage_mult: profileData.crit_damage_mult !== undefined ? Number(profileData.crit_damage_mult) : 0,
        max_energy: profileData.max_energy !== undefined ? Number(profileData.max_energy) : 100,
        xp_required: xp_required,
        action_points: profileData.action_points !== undefined ? Number(profileData.action_points) : 0,
        money: profileData.money !== undefined ? Number(profileData.money) : 0,

        user_id: currentUser.id,
        current_xp: Number(profileData.current_xp) || 0,
        resources: Number(profileData.gold) || 0,
        victories: Number(profileData.victories) || 0,
        defeats: Number(profileData.defeats) || 0,
        winning_streak: Number(profileData.winning_streak) || 0,
        status: profileData.status || 'Operacional',
        status_ends_at: profileData.status_ends_at || null,
        training_ends_at: profileData.training_ends_at || null,
        daily_training_count: Number(profileData.daily_training_count) || 0,
        last_training_reset: profileData.last_training_reset,
        active_training_type: profileData.active_training_type || null,
        pending_training_toast: profileData.pending_training_toast || null,
        toxicity: Number(profileData.toxicity) || 0,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        active_chips: profileData.active_chips || [],
        ucrypto: Number(profileData.ucrypto) || 0,
        merit: Number(profileData.merit) || 0,
        corruption: Number(profileData.corruption) || 0,
        pending_interception: profileData.pending_interception || null,
        inventory: profileData.inventory || [],
      };
    },
    [],
  );

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (import.meta.env.DEV) {
      console.debug("[UserProfileContext] 🔄 fetchProfile iniciado para:", user?.id);
    }
    if (!user) {
      setUserProfile(null);
      fetchedForUser.current = null;
      setLoading(false);
      return null;
    }

    if (isFetching.current) {
      if (import.meta.env.DEV) {
        console.debug("[UserProfileContext] Fetch já em andamento.");
      }
      return userProfile;
    }

    // Se já temos o perfil carregado para ESTE usuário exato, não precisamos de loading full-screen
    if (user?.id && fetchedForUser.current === user.id) {
      if (import.meta.env.DEV) {
        console.debug("[UserProfileContext] Perfil já carregado para este ID.");
      }
      setLoading(false);
      return userProfile;
    }

    isFetching.current = true;
    setLoading(true);

    const performFetch = async (retryCount = 0): Promise<UserProfile | null> => {
      try {
        const response = await api.get(`/users/profile?_t=${Date.now()}`);
        const profileData = response.data;

        // SÊNIOR: Sempre marcamos como buscado para este ID para evitar loading infinito,
        // mesmo que o retorno seja null (caso comum de novo usuário sem facção).
        fetchedForUser.current = user.id;

        if (profileData) {
          const processed = processProfileData(profileData, user);
          setUserProfile(processed);
          writeProfileCache(processed);
          setIsError(false);
          return processed;
        }

        // Se retornou null, garantimos que o estado local reflita isso
        setUserProfile(null);
        return null;
      } catch (error: any) {
        if (retryCount < 2 && (!error.response || error.response.status >= 500)) {
          // Retry for 5xx errors or network failures
          await new Promise(resolve => setTimeout(resolve, 2000));
          return performFetch(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      return await performFetch();
    } catch (error: any) {
      console.error("Falha ao buscar perfil do usuário:", error);
      setIsError(true);

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
            fetchedForUser.current = user.id; // Marca que tentamos buscar, evitando loading infinito
            break;
        }
      } else {
        // Erro genérico (500 ou falha de rede/backend offline)
        // NÃO destruímos o userProfile atualizando para null (preserva o cache offline).
        fetchedForUser.current = user.id; 
      }

      return userProfile; // Retorna o que sobrou (cache) em vez de forçar null
    } finally {
      if (import.meta.env.DEV) {
        console.debug("[UserProfileContext] ✅ fetchProfile finalizado.");
      }
      isFetching.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logout, navigate, processProfileData]);

  useEffect(() => {
    fetchProfile();
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async (force = false) => {
    // SÊNIOR: Se o SSE atualizou o estado recentemente (dentro da janela de
    // proteção), o estado React já está correto e mais recente que o banco
    // (debounce de 3s ainda pode estar pendente). Retornar sem fazer fetch
    // evita o rollback de estado observado ao navegar entre páginas.
    const msSinceSSE = Date.now() - lastSSEUpdateRef.current;
    if (!force && lastSSEUpdateRef.current > 0 && msSinceSSE < SSE_FRESHNESS_WINDOW_MS) {
      if (import.meta.env.DEV) {
        console.debug(`[refreshProfile] SSE recente (${msSinceSSE}ms atrás). Fetch ignorado para evitar rollback de estado.`);
      }
      return userProfile;
    }
    fetchedForUser.current = null;
    return await fetchProfile();
  }, [fetchProfile, userProfile]);

  const handleLogout = useCallback(() => {
    HUDCache.clear();
    writeProfileCache(null);
    
    // SÊNIOR: Chamamos o logout primeiro para limpar o 'user' no AuthContext.
    // Como o logout() agora é imediato, o ProtectedRoute verá user=null 
    // antes de processar a falta de facção, evitando flickers.
    logout(); 
    setUserProfile(null);
    
    navigate("/");
  }, [logout, navigate]);

  // ─── SSE: canal privado de estado do jogador ─────────────────────────────────
  // Quando o backend emite player:state, atualiza o React state IMEDIATAMENTE
  // sem nenhuma chamada HTTP adicional.
  const handlePlayerStateUpdate = useCallback((payload: PlayerStatePayload) => {
    // Registra o timestamp da última atualização SSE para proteger contra
    // fetches HTTP subsequentes que sobrescrevam estado correto com dados stale.
    lastSSEUpdateRef.current = Date.now();
    setUserProfile((prev) => {
      const next = mergePlayerStateIntoProfile(prev, payload);
      if (next) writeProfileCache(next);
      return next;
    });
  }, []);

  const handlePlayerStatusUpdate = useCallback((payload: { status: string; status_ends_at: string | null }) => {
    setUserProfile((prev) => prev ? {
      ...prev,
      status: payload.status,
      status_ends_at: payload.status_ends_at
    } : prev);
  }, []);

  // ─── Proteção contra Multi-Aba (Duplicate Session) ──────────────
  const [isDuplicate, setIsDuplicate] = useState(false);

  usePlayerStateSSE({
    userId: user?.id ?? null,
    onStateUpdate: handlePlayerStateUpdate,
    onStatusUpdate: handlePlayerStatusUpdate,
    onDuplicateSession: () => setIsDuplicate(true),
    onMarketUpdate: (payload) => {
      // SÊNIOR: Despacha um evento global customizado. 
      // Isso permite que a página DarkMarketPage ouça as mudanças sem abrir um segundo canal SSE.
      window.dispatchEvent(new CustomEvent("urbanclash:market_update", { detail: payload }));
    }
  });

  // SÊNIOR: Listener global para Socket.IO para detecção de duplicidade
  useEffect(() => {
    if (!user) {
      setIsDuplicate(false);
      return;
    }

    const handleDuplicate = () => {
      console.warn("[SOCKET] 🛡️ Sessão duplicada detectada via Socket.IO");
      setIsDuplicate(true);
    };

    socketService.onDuplicateSession(handleDuplicate);
    return () => {
      socketService.off("session_duplicate", handleDuplicate);
    };
  }, [user]);

  const DuplicateSessionOverlay = () => {
    if (!isDuplicate) return null;
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="max-w-md w-full border-2 border-red-500/30 p-8 bg-black/60 relative overflow-hidden" style={{ clipPath: "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)" }}>
          <div className="absolute top-0 left-0 bg-red-500 px-3 py-1">
            <span className="text-[10px] font-black text-black uppercase tracking-tighter">System_Alert</span>
          </div>
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center animate-pulse">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight font-orbitron">Sincronização Interrompida</h1>
            <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-widest font-medium">
              Sua conta foi conectada em outro dispositivo ou aba. Por segurança, esta sessão foi encerrada.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-red-500 hover:bg-red-400 text-black font-black font-orbitron text-xs tracking-[0.3em] uppercase transition-all"
              style={{ clipPath: "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)" }}
            >
              Sair e Limpar Cache
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ───────────────────────────────────────────────────────────────────
  // SÊNIOR: isProfileLoading só deve ser TRUE se não tivermos NADA (nem cache) 
  // e o usuário estiver logado esperando dados. Se tivermos cache (userProfile), 
  // o loading de atualização acontece em background sem travar o app.
  const isProfileLoading = useMemo(() => {
    if (!user) return false;
    
    // Se está explicitamente carregando e não temos NADA ainda
    if (loading && !userProfile) return true;
    
    // Se o usuário mudou (ID diferente do que buscamos) e não temos o perfil dele ainda
    if (user.id && fetchedForUser.current !== user.id && !userProfile) return true;
    
    return false;
  }, [loading, user, userProfile]);

  // SÊNIOR: Lógica para injetar status Aprimoramento se houver treino ativo
  const effectiveProfile = useMemo(() => {
    if (!userProfile) return null;
    const isTraining = userProfile.training_ends_at && new Date(userProfile.training_ends_at).getTime() > Date.now();
    
    // Se o backend enviar 'Operacional' mas o cronômetro de treino ainda corre,
    // forçamos o status para 'Aprimoramento' para as guardas de rota agirem.
    if (isTraining && userProfile.status === 'Operacional') {
      return { ...userProfile, status: 'Aprimoramento' };
    }
    return userProfile;
  }, [userProfile]);

  const currentStatusEndsAt = userProfile?.status_ends_at;
  const currentStatus = userProfile?.status;

  // SÊNIOR: Zero-Cron Client-Side Status Auto-Resolve
  // Quando uma expiração de status corre, nós transicionamos localmente para "Operacional"
  // sem qualquer custo de bateria ou requisição de polling. AAA Standard.
  useEffect(() => {
    if (!currentStatusEndsAt || currentStatus === 'Operacional') return;

    let timerId: NodeJS.Timeout;
    const endsAt = new Date(currentStatusEndsAt).getTime();
    const delay = Math.max(0, endsAt - Date.now());

    // Timeout máximo suportado é ~24.8 dias, check para segurança
    if (delay > 0 && delay < 2147483647) {
      timerId = setTimeout(() => {
        setUserProfile(prev => {
          if (!prev) return prev;
          // Verifica se ainda é o mesmo timer (contra race conditions)
          if (prev.status_ends_at !== currentStatusEndsAt) return prev;
          
          const next = { ...prev, status: 'Operacional', status_ends_at: null };
          writeProfileCache(next);
          return next;
        });
      }, delay + 150); // Mínimo atraso para garantir pass-through
    } else if (delay <= 0) {
       // Se o cálculo inicial já provar que acabou, vira operacional instantâneo
       setUserProfile(prev => {
          if (!prev || prev.status_ends_at !== currentStatusEndsAt) return prev;
          const next = { ...prev, status: 'Operacional', status_ends_at: null };
          writeProfileCache(next);
          return next;
       });
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [currentStatusEndsAt, currentStatus]);

  const contextValue = useMemo(
    () => ({
      userProfile: effectiveProfile,
      loading: isProfileLoading,
      isError,
      fetchProfile,
      refreshProfile,
      processProfileData,
      setUserProfile,
      handleLogout,
    }),
    [
      effectiveProfile,
      isProfileLoading,
      isError,
      fetchProfile,
      refreshProfile,
      processProfileData,
      handleLogout,
    ]
  );

  return (
    <UserProfileContext.Provider value={contextValue}>
      <DuplicateSessionOverlay />
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