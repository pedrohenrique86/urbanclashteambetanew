import { useState, useEffect, useRef } from 'react';
import { socketService, GameState, ServerTime } from '../services/socketService';

/**
 * A interface do objeto retornado pelo hook, contendo o estado atual do relógio do jogo.
 */
interface GameClock {
  status: string;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  serverTime: Date | null; // Adiciona a hora do servidor
}

/**
 * Um hook React para fornecer um cronômetro de jogo em tempo real,
 * sincronizado com o servidor via WebSockets.
 */
export const useGameClock = (): GameClock => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);

  const animationFrameId = useRef<number | null>(null);
  const lastServerUpdateTime = useRef<number>(0);

  useEffect(() => {
    // Conecta ao socket e registra os listeners
    socketService.connect();

    // Ouve o estado inicial do jogo, enviado pelo servidor no momento da conexão.
    const handleInitialState = (initialState: GameState) => {
      console.log('🎮 Estado inicial do jogo recebido:', initialState);
      setGameState(initialState);
      setDisplayTime(initialState.remainingTime);
      lastServerUpdateTime.current = Date.now();
    };

    // Ouve as atualizações de estado subsequentes, transmitidas para todos os clientes.
    const handleStateUpdate = (updatedState: GameState) => {
      console.log('🔄 Estado do jogo atualizado:', updatedState);
      setGameState(updatedState);
      setDisplayTime(updatedState.remainingTime);
      lastServerUpdateTime.current = Date.now();
    };

    socketService.on<GameState>('gameState', handleInitialState);
    socketService.on<GameState>('gameStateUpdated', handleStateUpdate);

    // Função de limpeza: remove os listeners quando o componente que usa o hook é desmontado.
    return () => {
      console.log("🧹 Limpando listeners do useGameClock.");
      socketService.off('gameState');
      socketService.off('gameStateUpdated');
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Considerar desconectar se for o último listener, mas por enquanto deixamos a conexão ativa.
      // socketService.disconnect(); 
    };
  }, []);

  // Efeito para controlar o loop de animação do cronômetro.
  useEffect(() => {
    const tick = () => {
      // Atualiza o cronômetro regressivo se estiver em andamento
      if (gameState?.status === 'running') {
        const now = Date.now();
        const elapsedTimeInSeconds = (now - lastServerUpdateTime.current) / 1000;
        const newRemainingTime = Math.max(0, gameState.remainingTime - elapsedTimeInSeconds);
        setDisplayTime(newRemainingTime);

        if (newRemainingTime <= 0) {
          setGameState(prev => prev ? { ...prev, status: 'finished' } : null);
        }
      }

      // Atualiza o relógio do servidor independentemente do status
      if (gameState?.serverTime) {
        const now = Date.now();
        const elapsedTime = now - lastServerUpdateTime.current;
        const currentServerTime = new Date(new Date(gameState.serverTime).getTime() + elapsedTime);
        setServerTime(currentServerTime);
      }

      animationFrameId.current = requestAnimationFrame(tick);
    };

    // Inicia o loop de animação se tivermos um estado
    if (gameState) {
      lastServerUpdateTime.current = Date.now();
      animationFrameId.current = requestAnimationFrame(tick);
    } else {
      // Cancela animação se não houver estado
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    // Função de limpeza
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState]); // Este efeito depende do gameState.

  // Retorna o estado simplificado para a UI consumir.
  return {
    status: gameState?.status || 'loading',
    remainingTime: Math.floor(displayTime),
    isActive: gameState?.isActive || false,
    isPaused: gameState?.isPaused || false,
    serverTime, // Expõe a hora do servidor
  };
};