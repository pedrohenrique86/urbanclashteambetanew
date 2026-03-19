import { useState, useEffect, useRef, useCallback } from 'react';
import { Player, Clan } from '../types/ranking';
import { fetchAllRankings, fetchFullRankings } from '../services/rankingService';
import { apiClient } from '../lib/supabaseClient';

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
const STORAGE_KEY_LIMITED = 'ranking_cache_limited';
const STORAGE_KEY_FULL = 'ranking_cache_full';
const TIMESTAMP_KEY_LIMITED = 'ranking_cache_timestamp_limited';
const TIMESTAMP_KEY_FULL = 'ranking_cache_timestamp_full';

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

export const useRankingCache = (fullRankings: boolean = false): UseRankingCacheReturn => {
  const [data, setData] = useState<RankingData>({
    gangsters: [],
    guardas: [],
    clans: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 1. saveToStorage: Não tem dependências de outras funções do hook
  const saveToStorage = useCallback((rankingData: RankingData, timestamp: number): void => {
    const storageKey = fullRankings ? STORAGE_KEY_FULL : STORAGE_KEY_LIMITED;
    const timestampKey = fullRankings ? TIMESTAMP_KEY_FULL : TIMESTAMP_KEY_LIMITED;
    
    localStorage.setItem(storageKey, JSON.stringify(rankingData));
    localStorage.setItem(timestampKey, timestamp.toString());
  }, [fullRankings]);

  // 2. fetchRankings: Depende de saveToStorage
  const fetchRankings = useCallback(async (): Promise<RankingData> => {
    const apiData = fullRankings ? await fetchFullRankings() : await fetchAllRankings();
    const rankingData: RankingData = {
      gangsters: apiData.gangsters || [],
      guardas: apiData.guardas || [],
      clans: apiData.clans || []
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
  }, [fullRankings, saveToStorage]);

  // 3. loadFromStorage: Não tem dependências de outras funções do hook
  const loadFromStorage = useCallback((): { data: RankingData | null; timestamp: number | null } => {
    const storageKey = fullRankings ? STORAGE_KEY_FULL : STORAGE_KEY_LIMITED;
    const timestampKey = fullRankings ? TIMESTAMP_KEY_FULL : TIMESTAMP_KEY_LIMITED;
    
    const cachedData = localStorage.getItem(storageKey);
    const cachedTimestamp = localStorage.getItem(timestampKey);
    
    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (isCacheValid(timestamp)) {
        return {
          data: JSON.parse(cachedData),
          timestamp
        };
      }
    }
    return { data: null, timestamp: null };
  }, [fullRankings]);

  // 4. loadRankings: Depende de loadFromStorage e fetchRankings
  const loadRankings = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let rankingData: RankingData;
      let timestamp: number;
      
      const currentGlobalCache = fullRankings ? globalCacheFull : globalCacheLimited;
      const currentGlobalTimestamp = fullRankings ? globalTimestampFull : globalTimestampLimited;
      const currentGlobalPromise = fullRankings ? globalPromiseFull : globalPromiseLimited;
      
      if (!forceRefresh && currentGlobalCache && currentGlobalTimestamp && isCacheValid(currentGlobalTimestamp)) {
        rankingData = currentGlobalCache;
        timestamp = currentGlobalTimestamp;
      } else {
        const { data: cachedData, timestamp: cachedTimestamp } = loadFromStorage();
        
        if (!forceRefresh && cachedData && cachedTimestamp && isCacheValid(cachedTimestamp)) {
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
            const newPromise = fetchRankings();
            if (fullRankings) {
              globalPromiseFull = newPromise;
            } else {
              globalPromiseLimited = newPromise;
            }
            rankingData = await newPromise;
            timestamp = (fullRankings ? globalTimestampFull : globalTimestampLimited) || Date.now();
            
            if (fullRankings) {
              globalPromiseFull = null;
            } else {
              globalPromiseLimited = null;
            }
          }
        }
      }
      
      if (mountedRef.current) {
        setData(rankingData);
        setLastUpdated(new Date(timestamp));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Erro ao carregar os rankings. Tente novamente.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fullRankings, fetchRankings, loadFromStorage]); // Corrigido // Corrigido

  // Função para forçar atualização
  const forceRefresh = async (): Promise<void> => {
    await loadRankings(true);
  };

  useEffect(() => {
    mountedRef.current = true;

    const scheduleSyncUpdates = async () => {
      try {
        const { serverTime } = await apiClient.getServerTime();
        const now = new Date(serverTime);
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();
        const minutesToNextInterval = 10 - (minutes % 10);
        const delay = (minutesToNextInterval * 60 - seconds) * 1000 - milliseconds;

        const timeoutId = setTimeout(() => {
          loadRankings(true);
          intervalRef.current = setInterval(() => {
            loadRankings(true);
          }, CACHE_DURATION);
        }, delay);

        intervalRef.current = timeoutId;

      } catch (error) {
        intervalRef.current = setInterval(() => {
          loadRankings();
        }, CACHE_DURATION);
      }
    };

    loadRankings();
    scheduleSyncUpdates();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        clearTimeout(intervalRef.current);
      }
    };
  }, [loadRankings]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    forceRefresh
  };
};