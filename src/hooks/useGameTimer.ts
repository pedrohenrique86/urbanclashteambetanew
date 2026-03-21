import { useState, useEffect, useCallback, useRef } from 'react';

// Tipos
export type GameStatus = 'stopped' | 'scheduled' | 'running' | 'paused' | 'finished';

export interface GameState {
  status: GameStatus;
  isActive: boolean;
  isPaused: boolean;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  remainingTime: number;
  serverTime: string;
}

export interface UseGameTimerReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  // Valores calculados localmente
  localRemainingTime: number;
  isRunning: boolean;
  progress: number; // 0-100
  formattedTime: string;
  // Ações
  refresh: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tempo entre sincronizações com o servidor (5 minutos)
const SYNC_INTERVAL = 5 * 60 * 1000;

export function useGameTimer(): UseGameTimerReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para cálculos locais sem re-render
  const serverTimeRef = useRef<Date | null>(null);
  const remainingTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState({});

  // Busca estado do servidor
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/time`);
      if (!response.ok) throw new Error('Erro ao buscar estado do jogo');
      
      const data = await response.json();
      
      if (data.gameState) {
        setGameState(data.gameState);
        serverTimeRef.current = new Date(data.serverTime);
        remainingTimeRef.current = data.gameState.remainingTime;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sincronização inicial
  useEffect(() => {
    fetchGameState();
    
    // Sincroniza com servidor a cada 5 minutos
    const syncInterval = setInterval(fetchGameState, SYNC_INTERVAL);
    
    return () => clearInterval(syncInterval);
  }, [fetchGameState]);

  // Cálculo local do cronômetro (a cada segundo)
  const isActive = gameState?.isActive ?? false;
  const isPaused = gameState?.isPaused ?? false;
  
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      if (remainingTimeRef.current > 0) {
        remainingTimeRef.current -= 1;
        forceUpdate({}); // Força re-render para atualizar UI
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  // Valores calculados
  const localRemainingTime = remainingTimeRef.current;
  const isRunning = gameState?.status === 'running' && localRemainingTime > 0;
  
  // Progresso (0-100)
  const progress = gameState?.duration 
    ? Math.max(0, Math.min(100, (localRemainingTime / gameState.duration) * 100))
    : 0;

  // Formatação do tempo (DD:HH:MM:SS)
  const formatTime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    gameState,
    loading,
    error,
    localRemainingTime,
    isRunning,
    progress,
    formattedTime: formatTime(localRemainingTime),
    refresh: fetchGameState
  };
}
