import { useState, useEffect, useRef } from 'react';
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

  // Função para verificar se o cache é válido
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Função para carregar dados do localStorage
  const loadFromStorage = (): { data: RankingData | null; timestamp: number | null } => {
    try {
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
    } catch (error) {
      console.warn('Erro ao carregar cache do localStorage:', error);
    }
    return { data: null, timestamp: null };
  };

  // Função para salvar dados no localStorage
  const saveToStorage = (rankingData: RankingData, timestamp: number): void => {
    try {
      const storageKey = fullRankings ? STORAGE_KEY_FULL : STORAGE_KEY_LIMITED;
      const timestampKey = fullRankings ? TIMESTAMP_KEY_FULL : TIMESTAMP_KEY_LIMITED;
      
      localStorage.setItem(storageKey, JSON.stringify(rankingData));
      localStorage.setItem(timestampKey, timestamp.toString());
    } catch (error) {
      console.warn('Erro ao salvar cache no localStorage:', error);
    }
  };

  // Função para buscar dados da API
  const fetchRankings = async (): Promise<RankingData> => {
    console.log(`🔄 Buscando rankings da API (${fullRankings ? 'completos' : 'limitados'})...`);
    
    try {
      const apiData = fullRankings ? await fetchFullRankings() : await fetchAllRankings();
      const rankingData: RankingData = {
        gangsters: apiData.gangsters || [],
        guardas: apiData.guardas || [],
        clans: apiData.clans || []
      };
      
      const timestamp = Date.now();
      
      // Atualizar cache global apropriado
      if (fullRankings) {
        globalCacheFull = rankingData;
        globalTimestampFull = timestamp;
      } else {
        globalCacheLimited = rankingData;
        globalTimestampLimited = timestamp;
      }
      
      // Salvar no localStorage
      saveToStorage(rankingData, timestamp);
      
      console.log(`✅ Rankings ${fullRankings ? 'completos' : 'limitados'} atualizados:`, {
        gangsters: rankingData.gangsters.length,
        guardas: rankingData.guardas.length,
        clans: rankingData.clans.length
      });
      
      return rankingData;
    } catch (err) {
      console.error('❌ Erro ao buscar rankings:', err);
      throw err;
    }
  };

  // Função para carregar dados (com cache)
  const loadRankings = async (forceRefresh = false): Promise<void> => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let rankingData: RankingData;
      let timestamp: number;
      
      // Obter referências do cache apropriado
      const currentGlobalCache = fullRankings ? globalCacheFull : globalCacheLimited;
      const currentGlobalTimestamp = fullRankings ? globalTimestampFull : globalTimestampLimited;
      const currentGlobalPromise = fullRankings ? globalPromiseFull : globalPromiseLimited;
      
      // Se não forçar refresh, tentar usar cache global primeiro
      if (!forceRefresh && currentGlobalCache && currentGlobalTimestamp && isCacheValid(currentGlobalTimestamp)) {
        console.log(`📦 Usando cache global ${fullRankings ? 'completo' : 'limitado'}`);
        rankingData = currentGlobalCache;
        timestamp = currentGlobalTimestamp;
      } else {
        // Tentar carregar do localStorage
        const { data: cachedData, timestamp: cachedTimestamp } = loadFromStorage();
        
        if (!forceRefresh && cachedData && cachedTimestamp && isCacheValid(cachedTimestamp)) {
          console.log(`💾 Usando cache do localStorage ${fullRankings ? 'completo' : 'limitado'}`);
          rankingData = cachedData;
          timestamp = cachedTimestamp;
          
          // Atualizar cache global apropriado
          if (fullRankings) {
            globalCacheFull = cachedData;
            globalTimestampFull = cachedTimestamp;
          } else {
            globalCacheLimited = cachedData;
            globalTimestampLimited = cachedTimestamp;
          }
        } else {
          // Se já existe uma requisição em andamento, aguardar ela
          if (currentGlobalPromise) {
            console.log(`⏳ Aguardando requisição ${fullRankings ? 'completa' : 'limitada'} em andamento...`);
            rankingData = await currentGlobalPromise;
            timestamp = currentGlobalTimestamp || Date.now();
          } else {
            // Fazer nova requisição
            const newPromise = fetchRankings();
            if (fullRankings) {
              globalPromiseFull = newPromise;
            } else {
              globalPromiseLimited = newPromise;
            }
            rankingData = await newPromise;
            timestamp = (fullRankings ? globalTimestampFull : globalTimestampLimited) || Date.now();
            
            // Limpar a promise após completar
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
        console.error('❌ Erro ao carregar rankings:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Função para forçar atualização
  const forceRefresh = async (): Promise<void> => {
    await loadRankings(true);
  };

  useEffect(() => {
    mountedRef.current = true;

    const scheduleSyncUpdates = async () => {
      try {
        // 1. Buscar a hora atual do servidor
        const { serverTime } = await apiClient.getServerTime();
        const now = new Date(serverTime);

        console.log(`[RankingCache] Hora do servidor recebida: ${now.toLocaleTimeString('pt-BR')}`);

        // 2. Calcular o tempo até o próximo intervalo de 10 minutos
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();

        const minutesToNextInterval = 10 - (minutes % 10);
        const delay = (minutesToNextInterval * 60 - seconds) * 1000 - milliseconds;

        console.log(`[RankingCache] Próxima atualização sincronizada agendada para as ${new Date(now.getTime() + delay).toLocaleTimeString('pt-BR')}`);

        // 3. Agendar a primeira atualização para o próximo intervalo
        const timeoutId = setTimeout(() => {
          console.log('[RankingCache] Executando atualização sincronizada agendada...');
          loadRankings(true); // Força a atualização para buscar novos dados

          // 4. Após a primeira atualização, criar um intervalo regular de 10 minutos
          intervalRef.current = setInterval(() => {
            console.log('[RankingCache] Executando atualização automática sincronizada (10 min).');
            loadRankings(true); // Força a atualização
          }, CACHE_DURATION);

        }, delay);

        // Armazena o ID do timeout para limpeza
        intervalRef.current = timeoutId;

      } catch (error) {
        console.error('[RankingCache] Erro ao sincronizar com a hora do servidor. Usando fallback para o método local.', error);
        // Fallback: se a sincronização falhar, usa o método antigo (não sincronizado)
        intervalRef.current = setInterval(() => {
          console.log('⏰ [Fallback] Atualização automática dos rankings (10 minutos)');
          loadRankings();
        }, CACHE_DURATION);
      }
    };

    // Carrega os dados na montagem inicial e agenda as atualizações sincronizadas
    loadRankings();
    scheduleSyncUpdates();

    // Função de limpeza para desmontagem do componente
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    forceRefresh
  };
};