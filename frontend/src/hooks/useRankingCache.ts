import { useState, useEffect, useRef, useCallback } from "react";
import { Player, Clan } from "../types/ranking";
import { fetchAllRankings } from "../services/rankingService";
import { apiClient } from "../lib/supabaseClient";

interface RankingData {
  gangsters: Player[];
  guardas: Player[];
  clans: Clan[];
}

interface UseRankingCacheReturn {
  data: RankingData;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  forceRefresh: () => Promise<void>;
}

const CACHE_DURATION = 10 * 60 * 1000;
const STORAGE_KEY = "ranking_cache_ssot";
const TIMESTAMP_KEY = "ranking_cache_timestamp_ssot";

const isCacheValid = (timestamp: number): boolean => {
  const ageSeconds = (Date.now() - timestamp) / 1000;
  // Reduzido para 2 minutos para evitar "teimosia" do cache durante o ciclo de 10 min
  return ageSeconds < 120;
};

// Singleton para memória cache
let globalCache: RankingData | null = null;
let globalTimestamp: number | null = null;
let globalPromise: Promise<RankingData> | null = null;

export const useRankingCache = (): UseRankingCacheReturn => {
  const [data, setData] = useState<RankingData>({
    gangsters: [],
    guardas: [],
    clans: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // 1. Persistência
  const saveToStorage = useCallback((rankingData: RankingData, timestamp: number): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rankingData));
    localStorage.setItem(TIMESTAMP_KEY, timestamp.toString());
  }, []);

  const loadFromStorage = useCallback((): { data: RankingData | null; timestamp: number | null } => {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      const timeStr = localStorage.getItem(TIMESTAMP_KEY);
      if (!dataStr || !timeStr) return { data: null, timestamp: null };
      return { data: JSON.parse(dataStr), timestamp: Number(timeStr) };
    } catch {
      return { data: null, timestamp: null };
    }
  }, []);

  // 2. Carregamento Principal
  const loadRankings = useCallback(async (options: { forceRefresh?: boolean; isInitialLoad?: boolean }): Promise<void> => {
    const { forceRefresh = false, isInitialLoad = false } = options;
    if (!mountedRef.current) return;

    try {
      if (isInitialLoad) setLoading(true);
      setError(null);

      let rankingData: RankingData | null = null;
      let timestamp: number | null = null;

      // Fase 1: Memória
      if (!forceRefresh && globalCache && globalTimestamp && isCacheValid(globalTimestamp)) {
        rankingData = globalCache;
        timestamp = globalTimestamp;
      } else {
        // Fase 2: Storage
        const storage = loadFromStorage();
        if (!forceRefresh && storage.data && storage.timestamp && isCacheValid(storage.timestamp)) {
          rankingData = storage.data;
          timestamp = storage.timestamp;
          globalCache = storage.data;
          globalTimestamp = storage.timestamp;
        } else {
          // Fase 3: API (De-duplicado)
          if (globalPromise) {
            try {
              rankingData = await globalPromise;
              timestamp = globalTimestamp || Date.now();
            } catch (err) {
              globalPromise = null;
              throw err;
            }
          } else {
            const fetchTask = async () => {
              const result = await fetchAllRankings(forceRefresh);
              const time = Date.now();
              globalCache = result;
              globalTimestamp = time;
              saveToStorage(result, time);
              return result;
            };
            globalPromise = fetchTask();
            try {
              rankingData = await globalPromise;
              timestamp = globalTimestamp;
            } finally {
              globalPromise = null;
            }
          }
        }
      }

      if (mountedRef.current && rankingData) {
        setData(prev => mergeData(prev, rankingData!));
        setLastUpdated(new Date(timestamp || Date.now()));
      }
    } catch (err) {
      if (mountedRef.current) setError("Erro ao carregar rankings");
    } finally {
      if (isInitialLoad && mountedRef.current) setLoading(false);
    }
  }, [saveToStorage, loadFromStorage]);

  const forceRefresh = useCallback(async () => {
    await loadRankings({ forceRefresh: true, isInitialLoad: false });
  }, [loadRankings]);

  const loadRankingsRef = useRef(loadRankings);
  const forceRefreshRef = useRef(forceRefresh);
  useEffect(() => {
    loadRankingsRef.current = loadRankings;
    forceRefreshRef.current = forceRefresh;
  }, [loadRankings, forceRefresh]);

  // 3. Ciclo de Vida e Timers
  useEffect(() => {
    mountedRef.current = true;
    loadRankingsRef.current({ isInitialLoad: true });

    const scheduleNextRefresh = () => {
      // Usamos a hora local para calcular o próximo ciclo de 10 min.
      // O SSE já lidará com atualizações precisas; este timer é apenas um fallback.
      const now = new Date();
      const delay = (10 - (now.getMinutes() % 10)) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
      
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        forceRefreshRef.current();
        intervalRef.current = setInterval(() => {
          if (mountedRef.current) forceRefreshRef.current();
        }, CACHE_DURATION);
      }, Math.max(0, delay));
    };

    scheduleNextRefresh();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 4. SSE (Real-time SSOT)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let refreshDebounce: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!mountedRef.current) return;
      
      const url = apiClient.getApiUrl("/public/rankings/subscribe");
      // Não enviamos credenciais para permitir acesso 100% público
      eventSource = new EventSource(url);

      const events = [
        "ranking:snapshot:users:gangsters",
        "ranking:snapshot:users:guardas",
        "ranking:snapshot:users:all",
        "ranking:snapshot:clans"
      ];

      events.forEach(name => {
        eventSource?.addEventListener(name, (event: any) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            if (!data) return;

            // Atualização Direta (Zero Race Condition)
            setData(prev => {
              const updated = { ...prev };
              if (name.includes(":gangsters")) updated.gangsters = data;
              else if (name.includes(":guardas")) updated.guardas = data;
              else if (name.includes(":all")) {
                 // No snapshot 'all' o backend manda o ranking geral de players
                 // Dependendo da implementação, podemos atualizar as listas ou ignorar
                 // mas o ideal é que o 'all' reflita a aba "Todos" se ela existir.
              }
              else if (name.includes(":clans")) updated.clans = data;
              
              return mergeData(prev, updated);
            });
            
            setLastUpdated(new Date());
          } catch (err) {
            // Se falhar o parse, fazemos o fallback de re-fetch
            if (refreshDebounce) clearTimeout(refreshDebounce);
            refreshDebounce = setTimeout(() => {
              if (mountedRef.current) forceRefreshRef.current();
            }, 1000);
          }
        });
      });

      // NOVO: Escuta atualizações individuais em tempo real (ex: treinos offline terminando)
      eventSource?.addEventListener("ranking:player:update", (event: any) => {
        if (!mountedRef.current) return;
        
        try {
          // Quando algum jogador tem uma alteração crítica de XP/nível, 
          // re-buscamos o snapshot para garantir a posição correta, com debounce 
          // para evitar spam se 500 pessoas terminarem o treino juntas.
          if (refreshDebounce) clearTimeout(refreshDebounce);
          refreshDebounce = setTimeout(() => {
            if (mountedRef.current) forceRefreshRef.current();
          }, 3000); // 3 segundos de debounce para updates competitivos
        } catch (err) {
          console.warn("[ranking] Falha ao processar ranking:player:update:", err);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (mountedRef.current) reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (refreshDebounce) clearTimeout(refreshDebounce);
    };
  }, []);

  return { data, loading, error, lastUpdated, forceRefresh };
};

const mergeData = (oldData: RankingData, newData: RankingData): RankingData => {
  const isPlayerEqual = (p1: Player, p2: Player) => 
    p1.id === p2.id && p1.username === p2.username && p1.level === p2.level && 
    p1.position === p2.position && p1.current_xp === p2.current_xp &&
    p1.display_name === p2.display_name && p1.avatar_url === p2.avatar_url &&
    p1.faction === p2.faction && p1.country === p2.country && p1.clan_name === p2.clan_name;

  const playerMap = new Map(oldData.gangsters.map(p => [p.id, p]));
  const gangsters = newData.gangsters.map(p => {
    const old = playerMap.get(p.id);
    return old && isPlayerEqual(old, p) ? old : p;
  });

  const guardasMap = new Map(oldData.guardas.map(p => [p.id, p]));
  const guardas = newData.guardas.map(p => {
    const old = guardasMap.get(p.id);
    return old && isPlayerEqual(old, p) ? old : p;
  });

  const isClanEqual = (c1: Clan, c2: Clan) =>
    c1.id === c2.id && c1.name === c2.name && c1.score === c2.score &&
    c1.position === c2.position && c1.memberCount === c2.memberCount && 
    c1.leaderName === c2.leaderName && c1.faction === c2.faction;

  const clanMap = new Map(oldData.clans.map(c => [c.id, c]));
  const clans = newData.clans.map(c => {
    const old = clanMap.get(c.id);
    return old && isClanEqual(old, c) ? old : c;
  });

  return { gangsters, guardas, clans };
};
