import { useGameClockContext } from "../contexts/GameClockContext";

/**
 * Hook customizado que consome o estado global do cronômetro do jogo.
 * Retorna as informações sincronizadas de status, tempo restante e hora do servidor.
 */
export const useGameClock = () => {
  return useGameClockContext();
};