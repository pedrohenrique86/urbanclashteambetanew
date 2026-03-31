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
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  // Ref para armazenar a última sincronização de tempo com o servidor.
  const lastServerUpdateTime = useRef<{ serverTime: string; localTime: number } | null>(
    null,
  );

  useEffect(() => {
    // Conecta ao socket, registra os listeners e pede o estado atual
    socketService.connect();
    socketService.emit('getGameState'); // Pede ativamente o estado ao conectar

    // Ouve o estado inicial do jogo, enviado pelo servidor no momento da conexão.
    const handleInitialState = (initialState: GameState) => {
      console.log("🎮 Estado inicial do jogo recebido:", initialState);
      setGameState(initialState);
      if (initialState.serverTime) {
        lastServerUpdateTime.current = {
          serverTime: initialState.serverTime,
          localTime: Date.now(),
        };
        setIsTimeSynced(true); // Marca que a sincronização inicial ocorreu
      }
    };

    // Ouve as atualizações de estado subsequentes, transmitidas para todos os clientes.
    const handleStateUpdate = (updatedState: GameState) => {
      console.log("🔄 Estado do jogo atualizado:", updatedState);
      setGameState(updatedState);
      if (updatedState.serverTime) {
        lastServerUpdateTime.current = {
          serverTime: updatedState.serverTime,
          localTime: Date.now(),
        };
        setIsTimeSynced(true); // Garante a sincronização em atualizações
      }
    };

    socketService.on<GameState>("gameState", handleInitialState);
    socketService.on<GameState>("gameStateUpdated", handleStateUpdate);

    // Função de limpeza: remove os listeners quando o componente que usa o hook é desmontado.
    return () => {
      console.log("🧹 Limpando listeners do useGameClock.");
      socketService.off("gameState");
      socketService.off("gameStateUpdated");
      // Considerar desconectar se for o último listener, mas por enquanto deixamos a conexão ativa.
      // socketService.disconnect();
    };
  }, []);

  // Efeito para controlar o cronômetro do jogo com setInterval.
  useEffect(() => {
    // Se não houver estado do jogo, não faz nada.
    if (!gameState) return;

    // Se o jogo não está em contagem (correndo ou agendado),
    // apenas exibe o tempo restante estático e para qualquer timer.
    if (gameState.status !== "running" && gameState.status !== "scheduled") {
      setDisplayTime(gameState.remainingTime);
      return; // Sai do efeito sem criar um intervalo.
    }

    // Cria um intervalo que roda a cada segundo.
    const intervalId = setInterval(() => {
      // --- LÓGICA DE CONTAGEM REGRESSIVA DO JOGO ---
      let remaining = 0;

      // Se o jogo está correndo, calcula o tempo restante até o fim.
      if (gameState.status === "running" && gameState.endTime) {
        const endTime = new Date(gameState.endTime).getTime();
        remaining = Math.floor((endTime - Date.now()) / 1000);
      }
      // Se o jogo está agendado, calcula o tempo restante até o início.
      else if (gameState.status === "scheduled" && gameState.startTime) {
        const startTime = new Date(gameState.startTime).getTime();
        remaining = Math.floor((startTime - Date.now()) / 1000);
      }

      // Garante que o tempo exibido nunca seja negativo.
      setDisplayTime(Math.max(0, remaining));

      // Se o tempo acabou, o frontend precisa saber o que fazer.
      if (remaining <= 0) {
        // Se a rodada estava correndo, ela terminou. Pode-se mudar o estado localmente.
        if (gameState.status === "running") {
          setGameState(prev => (prev ? { ...prev, status: "finished" } : null));
        }
        // Se a rodada estava agendada, ela deve começar.
        // A fonte da verdade é o backend, então pedimos o novo estado.
        if (gameState.status === "scheduled") {
          socketService.emit("getGameState");
        }
      }
    }, 1000);

    // Função de limpeza: é CRUCIAL para evitar vazamentos de memória.
    // Ela é chamada quando o componente é desmontado ou quando o `gameState` muda.
    return () => {
      clearInterval(intervalId);
    };
  }, [gameState]); // Este efeito depende SOMENTE do gameState.

  // Efeito dedicado para o relógio do servidor, independente do estado do jogo.
  useEffect(() => {
    if (!isTimeSynced) return;

    const intervalId = setInterval(() => {
      if (lastServerUpdateTime.current) {
        const elapsed = Date.now() - lastServerUpdateTime.current.localTime;
        const currentServerTime = new Date(
          new Date(lastServerUpdateTime.current.serverTime).getTime() + elapsed,
        );
        setServerTime(currentServerTime);
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTimeSynced]);

  // Retorna o estado simplificado para a UI consumir.
  return {
    status: gameState?.status || "loading",
    remainingTime: Math.floor(displayTime),
    isActive: gameState?.isActive || false,
    isPaused: gameState?.isPaused || false,
    serverTime, // Expõe a hora do servidor
  };
};