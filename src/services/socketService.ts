import { io, Socket } from "socket.io-client";

// Tipagem para o estado do jogo recebido do servidor
interface GameState {
  status: string;
  startTime: string | null;
  duration: number | null;
  serverTime: string;
  isActive: boolean;
  isPaused: boolean;
  endTime: string | null;
  remainingTime: number;
  gameStatus: string;
  lastUpdated: string;
}

// Tipagem para a hora do servidor
interface ServerTime {
  serverTime: number;
}

// URL do seu backend. Certifique-se de que esta variável de ambiente está configurada.
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  /**
   * Conecta ao servidor Socket.IO se ainda não estiver conectado.
   */
  connect(): Socket {
    if (!this.socket) {
      this.socket = io(VITE_API_BASE_URL, {
        transports: ["websocket"], // Força o uso de WebSockets para melhor performance
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        console.log("🔌 Conectado ao servidor Socket.IO:", this.socket?.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("🔌 Desconectado do servidor Socket.IO:", reason);
      });

      this.socket.on("connect_error", (error) => {
        console.error("🔌 Erro de conexão com o Socket.IO:", error);
      });
    }
    return this.socket;
  }

  /**
   * Desconecta do servidor.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Registra um listener para um evento específico.
   * @param event - O nome do evento a ser ouvido.
   * @param callback - A função a ser executada quando o evento for recebido.
   */
  on<T>(event: string, callback: (data: T) => void): void {
    this.connect()?.on(event, callback);
  }

  /**
   * Remove um listener de um evento específico.
   * @param event - O nome do evento.
   */
  off(event: string): void {
    this.connect()?.off(event);
  }

  /**
   * Emite um evento para o servidor.
   * @param event - O nome do evento a ser emitido.
   * @param data - Os dados a serem enviados com o evento (opcional).
   */
  emit<T>(event: string, data?: T): void {
    this.connect()?.emit(event, data);
  }
}

// Exporta uma instância única (singleton) do serviço
export const socketService = new SocketService();

// Exporta os tipos para serem usados em outros lugares da aplicação
export type { GameState, ServerTime };