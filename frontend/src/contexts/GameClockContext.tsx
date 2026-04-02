import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { socketService, GameState } from "../services/socketService";

/**
 * Interface dos dados expostos pelo GameClockContext.
 */
interface GameClockContextType {
  status: string;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  serverTime: Date | null;
}

const GameClockContext = createContext<GameClockContextType | undefined>(undefined);

/**
 * Provedor Global do Cronômetro do Jogo.
 * Centraliza a conexão Socket.IO e o timer para evitar múltiplas instâncias.
 */
export const GameClockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [isTimeSynced, setIsTimeSynced] = useState(false);

  // Ref para armazenar a última sincronização de tempo com o servidor.
  const lastServerUpdateTime = useRef<{ serverTime: string; localTime: number } | null>(null);

  useEffect(() => {
    // 1. Conecta ao socket, registra os listeners e pede o estado atual
    socketService.connect();
    socketService.emit("getGameState");

    const handleInitialState = (initialState: GameState) => {
      console.log("🎮 [Context] Estado inicial do jogo recebido:", initialState);
      setGameState(initialState);
      if (initialState.serverTime) {
        lastServerUpdateTime.current = {
          serverTime: initialState.serverTime,
          localTime: Date.now(),
        };
        setIsTimeSynced(true);
      }
    };

    const handleStateUpdate = (updatedState: GameState) => {
      console.log("🔄 [Context] Estado do jogo atualizado:", updatedState);
      setGameState(updatedState);
      if (updatedState.serverTime) {
        lastServerUpdateTime.current = {
          serverTime: updatedState.serverTime,
          localTime: Date.now(),
        };
        setIsTimeSynced(true);
      }
    };

    socketService.on<GameState>("gameState", handleInitialState);
    socketService.on<GameState>("gameStateUpdated", handleStateUpdate);

    return () => {
      console.log("🧹 [Context] Limpando listeners globais do GameClock.");
      socketService.off("gameState", handleInitialState);
      socketService.off("gameStateUpdated", handleStateUpdate);
    };
  }, []);

  // Timer para o Cronômetro do Jogo
  useEffect(() => {
    if (!gameState) return;

    if (gameState.status !== "running" && gameState.status !== "scheduled") {
      setDisplayTime(gameState.remainingTime);
      return;
    }

    const intervalId = setInterval(() => {
      let remaining = 0;

      if (gameState.status === "running" && gameState.endTime) {
        const endTime = new Date(gameState.endTime).getTime();
        remaining = Math.floor((endTime - Date.now()) / 1000);
      } else if (gameState.status === "scheduled" && gameState.startTime) {
        const startTime = new Date(gameState.startTime).getTime();
        remaining = Math.floor((startTime - Date.now()) / 1000);
      }

      setDisplayTime(Math.max(0, remaining));

      if (remaining <= 0) {
        if (gameState.status === "running") {
          setGameState((prev) => (prev ? { ...prev, status: "finished" } : null));
        }
        if (gameState.status === "scheduled") {
          socketService.emit("getGameState");
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameState]);

  // Timer para o Relógio do Servidor
  useEffect(() => {
    if (!isTimeSynced) return;

    const intervalId = setInterval(() => {
      if (lastServerUpdateTime.current) {
        const elapsed = Date.now() - lastServerUpdateTime.current.localTime;
        const currentServerTime = new Date(
          new Date(lastServerUpdateTime.current.serverTime).getTime() + elapsed
        );
        setServerTime(currentServerTime);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTimeSynced]);

  const value = {
    status: gameState?.status || "loading",
    remainingTime: Math.floor(displayTime),
    isActive: gameState?.isActive || false,
    isPaused: gameState?.isPaused || false,
    serverTime,
  };

  return <GameClockContext.Provider value={value}>{children}</GameClockContext.Provider>;
};

/**
 * Hook para consumir o estado global do cronômetro.
 */
export const useGameClockContext = () => {
  const context = useContext(GameClockContext);
  if (context === undefined) {
    throw new Error("useGameClockContext deve ser usado dentro de um GameClockProvider");
  }
  return context;
};
