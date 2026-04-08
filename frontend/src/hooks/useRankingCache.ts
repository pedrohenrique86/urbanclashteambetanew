import { useState, useEffect, useRef, useCallback } from "react";
import { Player, Clan } from "../types/ranking";
import {
  fetchAllRankings,
  fetchFullRankings,
} from "../services/rankingService";
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

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos em milissegundos
const STORAGE_KEY_LIMITED = "ranking_cache_limited";
const STORAGE_KEY_FULL = "ranking_cache_full";
const TIMESTAMP_KEY_LIMITED = "ranking_cache_timestamp_limited";
const TIMESTAMP_KEY_FULL = "ranking_cache_timestamp_full";

// Função para verificar se o cache é válido
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Cache global para compartilhar entre componentes (separado por tipo)
let globalCacheLimited: RankingData | null = null;
let globalTimestampLimited: number | null = null;
let globalPromiseLimited: Promise<RankingData> | null = null;

let globalCacheFull: RankingData | null = null;
let globalTimestampFull: number | null = null;
let globalPromiseFull: Promise<RankingData> | null = null;

/**
 * Hook para gerenciar e cachear dados de ranking (jogadores e clãs).
 *
 * @param fullRankings - Se `true`, busca os rankings completos. Se `false`, busca uma versão limitada (Top 5).
 * @returns Um objeto com os dados do ranking, estado de loading, erros e funções de controle.
 *
 * @description
 * Este hook foi projetado para ser altamente eficiente e estável, seguindo padrões específicos:
 * 1.  **Cache em Múltiplas Camadas**: Utiliza um cache global em memória (para a sessão atual), um cache local
 *     no `localStorage` (para persistência entre sessões) e um mecanismo de `Promise` compartilhada para
 *     evitar requisições duplicadas durante o carregamento inicial.
 * 2.  **Atualização Sincronizada**: Agenda atualizações automáticas para ocorrerem em intervalos de 10 minutos
 *     (ex: 12:00, 12:10, 12:20), sincronizando com o backend. Tenta obter a hora do servidor para precisão,
 *     mas possui um fallback para o relógio do cliente.
 * 3.  **Atualizações em Tempo Real via SSE**: Ouve por eventos de Server-Sent Events (SSE) para disparar
 *     atualizações imediatas quando o backend notifica que os rankings mudaram.
 * 4.  **Estabilidade e Prevenção de Loops**: Os `useEffect`s principais têm um array de dependências vazio (`[]`).
 *     Isso é intencional e garante que a lógica de inicialização, agendamento de timers e listeners de SSE
 *     seja executada **apenas uma vez**, quando o componente é montado. As funções dinâmicas (`loadRankings`,
 *     `forceRefresh`) são acessadas através de `refs` para que suas recriações não disparem os efeitos
 *     novamente. Isso torna o hook autônomo e não reativo a mudanças de props ou estado externo,
 *     eliminando o risco de loops de renderização.
 * 5.  **Otimização de Renderização**: Utiliza uma função `mergeData` para comparar os dados novos com os antigos.
 *     Se um item (jogador ou clã) não mudou, a referência do objeto antigo é mantida, prevenindo
 *     re-renderizações desnecessárias nos componentes filhos que recebem esses dados.
 */
export const useRankingCache = (
  fullRankings: boolean = false,
): UseRankingCacheReturn => {
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

  // 1. saveToStorage: Não tem dependências de outras funções do hook
  const saveToStorage = useCallback(
    (rankingData: RankingData, timestamp: number): void => {
      const storageKey = fullRankings ? STORAGE_KEY_FULL : STORAGE_KEY_LIMITED;
      const timestampKey = fullRankings
        ? TIMESTAMP_KEY_FULL
        : TIMESTAMP_KEY_LIMITED;

      localStorage.setItem(storageKey, JSON.stringify(rankingData));
      localStorage.setItem(timestampKey, timestamp.toString());
    },
    [fullRankings],
  );

  // 2. fetchRankings: Depende de saveToStorage
  const fetchRankings = useCallback(
    async (force = false): Promise<RankingData> => {
      const apiData = fullRankings
        ? await fetchFullRankings(force)
        : await fetchAllRankings(force);
      const rankingData: RankingData = {
        gangsters: apiData.gangsters || [],
        guardas: apiData.guardas || [],
        clans: apiData.clans || [],
      };

      const timestamp = Date.now();

      if (fullRankings) {
        globalCacheFull = rankingData;
        globalTimestampFull = timestamp;
      } else {
        globalCacheLimited = rankingData;
        globalTimestampLimited = timestamp;
      }

      saveToStorage(rankingData, timestamp);

      return rankingData;
    },
    [fullRankings, saveToStorage],
  );

  // 3. loadFromStorage: Não tem dependências de outras funções do hook
  const loadFromStorage = useCallback((): {
    data: RankingData | null;
    timestamp: number | null;
  } => {
    const storageKey = fullRankings ? STORAGE_KEY_FULL : STORAGE_KEY_LIMITED;
    const timestampKey = fullRankings
      ? TIMESTAMP_KEY_FULL
      : TIMESTAMP_KEY_LIMITED;

    const cachedData = localStorage.getItem(storageKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);

    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (isCacheValid(timestamp)) {
        return {
          data: JSON.parse(cachedData),
          timestamp,
        };
      }
    }
    return { data: null, timestamp: null };
  }, [fullRankings]);

  // 4. loadRankings: Depende de loadFromStorage e fetchRankings
  const loadRankings = useCallback(
    async (options: {
      forceRefresh?: boolean;
      isInitialLoad?: boolean;
    }): Promise<void> => {
      const { forceRefresh = false, isInitialLoad = false } = options;
      if (!mountedRef.current) return;

      try {
        // O loading global só é ativado no carregamento inicial para evitar flicker
        // em atualizações de fundo (via SSE ou timer).
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);

        let rankingData: RankingData;
        let timestamp: number;

        const currentGlobalCache = fullRankings
          ? globalCacheFull
          : globalCacheLimited;
        const currentGlobalTimestamp = fullRankings
          ? globalTimestampFull
          : globalTimestampLimited;
        const currentGlobalPromise = fullRankings
          ? globalPromiseFull
          : globalPromiseLimited;

        if (
          !forceRefresh &&
          currentGlobalCache &&
          currentGlobalTimestamp &&
          isCacheValid(currentGlobalTimestamp)
        ) {
          rankingData = currentGlobalCache;
          timestamp = currentGlobalTimestamp;
        } else {
          const { data: cachedData, timestamp: cachedTimestamp } =
            loadFromStorage();

          if (
            !forceRefresh &&
            cachedData &&
            cachedTimestamp &&
            isCacheValid(cachedTimestamp)
          ) {
            rankingData = cachedData;
            timestamp = cachedTimestamp;

            if (fullRankings) {
              globalCacheFull = cachedData;
              globalTimestampFull = cachedTimestamp;
            } else {
              globalCacheLimited = cachedData;
              globalTimestampLimited = cachedTimestamp;
            }
          } else {
            if (currentGlobalPromise) {
              rankingData = await currentGlobalPromise;
              timestamp = currentGlobalTimestamp || Date.now();
            } else {
              const newPromise = fetchRankings(forceRefresh);
              if (fullRankings) {
                globalPromiseFull = newPromise;
              } else {
                globalPromiseLimited = newPromise;
              }
              rankingData = await newPromise;
              timestamp =
                (fullRankings ? globalTimestampFull : globalTimestampLimited) ||
                Date.now();

              if (fullRankings) {
                globalPromiseFull = null;
              } else {
                globalPromiseLimited = null;
              }
            }
          }
        }

        if (mountedRef.current) {
          // Em vez de substituir, mescla os dados para evitar re-renders desnecessários
          setData((prevData) => mergeData(prevData, rankingData));
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (mountedRef.current) {
          setError("Erro ao carregar os rankings. Tente novamente.");
        }
      } finally {
        // Garante que o loading seja desativado apenas se foi um carregamento inicial.
        if (isInitialLoad && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [fullRankings, fetchRankings, loadFromStorage],
  );

  // Usamos refs para as funções para que o useEffect principal não precise depender delas,
  // evitando re-execuções e potenciais loops.
  const loadRankingsRef = useRef(loadRankings);
  loadRankingsRef.current = loadRankings;

  // Função para forçar atualização
  const forceRefresh = useCallback(async (): Promise<void> => {
    // Acessa a última versão de loadRankings através da ref.
    // Atualizações forçadas não são consideradas "carregamento inicial".
    await loadRankingsRef.current({ forceRefresh: true, isInitialLoad: false });
  }, []); // Nenhuma dependência necessária, pois a ref é estável.

  useEffect(() => {
    mountedRef.current = true;

    // A lógica de agendamento é encapsulada para ser chamada sem bloquear o fluxo.
    const scheduleNextRefresh = () => {
      // Limpa timers antigos antes de agendar um novo para evitar duplicidade.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);

      apiClient
        .getServerTime()
        .then(({ serverTime }) => {
          const now = new Date(serverTime);
          const minutes = now.getMinutes();
          const seconds = now.getSeconds();
          const milliseconds = now.getMilliseconds();

          const minutesToNextInterval = 10 - (minutes % 10);
          const delay =
            (minutesToNextInterval * 60 - seconds) * 1000 - milliseconds;

          timeoutRef.current = setTimeout(
            () => {
              if (!mountedRef.current) return;
              forceRefreshRef.current();
              intervalRef.current = setInterval(
                () => forceRefreshRef.current(),
                CACHE_DURATION,
              );
            },
            Math.max(0, delay),
          );
        })
        .catch(() => {
          // Fallback: se a chamada ao servidor falhar, agenda um intervalo simples.
          if (!mountedRef.current) return;
          intervalRef.current = setInterval(
            () => forceRefreshRef.current(),
            CACHE_DURATION,
          );
        });
    };

    // Inicia o carregamento dos dados imediatamente.
    loadRankingsRef.current({ isInitialLoad: true });

    // Agenda a próxima atualização sem bloquear o carregamento inicial.
    scheduleNextRefresh();

    return () => {
      mountedRef.current = false;
      // Limpeza robusta de ambos os timers.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // O array de dependências está vazio para garantir que este efeito rode apenas uma vez (no mount).
    // As funções são acessadas via refs para evitar que suas recriações causem um novo disparo do efeito,
    // o que elimina o risco de loops de renderização e múltiplas execuções de timers ou listeners.
  }, []);

  // Usamos uma ref para manter a versão mais recente da função forceRefresh.
  // Isso evita que o useEffect do SSE seja recriado a cada renderização, prevenindo múltiplas conexões.
  const forceRefreshRef = useRef(forceRefresh);
  forceRefreshRef.current = forceRefresh;

  useEffect(() => {
    const base = (import.meta as any).env?.VITE_API_URL;
    if (!base) return;

    let eventSource: EventSource | null = null;
    try {
      const url = `${base}/api/users/rankings/subscribe`;
      eventSource = new EventSource(url, { withCredentials: true });
      // O evento 'rankings' agora cobre tanto usuários quanto clãs
      eventSource.addEventListener("rankings", () => {
        // Chama a versão mais recente da função através da ref para evitar dependência direta.
        forceRefreshRef.current();
      });
    } catch (e) {
      void e;
    }
    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    forceRefresh,
  };
};

// Função auxiliar para mesclar dados antigos e novos, evitando re-renders
const mergeData = (oldData: RankingData, newData: RankingData): RankingData => {
  const playerMap = new Map(oldData.gangsters.map((p) => [p.id, p]));
  const newGangsters = newData.gangsters.map((p) => {
    const oldPlayer = playerMap.get(p.id);
    if (
      oldPlayer &&
      oldPlayer.level === p.level &&
      oldPlayer.position === p.position &&
      oldPlayer.current_xp === p.current_xp
    ) {
      return oldPlayer; // Mantém a referência do objeto antigo se nada mudou
    }
    return p;
  });

  const guardasMap = new Map(oldData.guardas.map((p) => [p.id, p]));
  const newGuardas = newData.guardas.map((p) => {
    const oldPlayer = guardasMap.get(p.id);
    if (
      oldPlayer &&
      oldPlayer.level === p.level &&
      oldPlayer.position === p.position &&
      oldPlayer.current_xp === p.current_xp
    ) {
      return oldPlayer;
    }
    return p;
  });

  const clanMap = new Map(oldData.clans.map((c) => [c.id, c]));
  const newClans = newData.clans.map((c) => {
    const oldClan = clanMap.get(c.id);
    if (
      oldClan &&
      oldClan.score === c.score &&
      oldClan.position === c.position
    ) {
      return oldClan;
    }
    return c;
  });

  return {
    gangsters: newGangsters,
    guardas: newGuardas,
    clans: newClans,
  };
};
