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

// --- Tipagens do Chat ---

interface ChatMessage {
  id: string; // Adicionado ID robusto para deduplicação
  userId: string;
  username: string;
  avatar?: string;
  faction?: string;
  country?: string;
  text: string;
  timestamp: string;
}

// --- Fim das Tipagens do Chat ---

// URL do seu backend. Certifique-se de que esta variável de ambiente está configurada.
const VITE_API_URL = import.meta.env.VITE_API_URL as string;

class SocketService {
  private socket: Socket | null = null;
  public readonly cid: string; // SÊNIOR: Identificador único da aba/instância para o Anti-Multi-Aba

  constructor() {
    this.cid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Conecta ao servidor Socket.IO se ainda não estiver conectado.
   */
  connect(): Socket {
    if (!this.socket) {
      // Remove o sufixo /api da URL para evitar o erro de "Invalid namespace"
      // O Socket.IO entende qualquer path na URL (ex: http://localhost:3001/api)
      // como sendo um "namespace" (/api), que não existe no backend.
      const socketUrl = (VITE_API_URL || "").replace(/\/api\/?$/, "");

      console.log("🔌 Iniciando conexão Socket.IO em:", socketUrl);

      // SÊNIOR: Forçamos apenas 'websocket' para evitar loops de reconexão
      // no modo polling que falham devido à falta de Sticky Sessions no Cloudflare/Proxy.
      this.socket = io(socketUrl, {
        reconnectionAttempts: 20,
        reconnectionDelay: 2000,
        path: "/socket.io/",
        transports: ["websocket"],
        secure: socketUrl.startsWith("https"),
        withCredentials: true,
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
   * @param callback - Evento opcional para remover apenas um listener específico.
   */
  off<T>(event: string, callback?: (data: T) => void): void {
    if (callback) {
      // O Socket.IO suporta remover um listener específico se fornecido
      this.connect()?.off(event, callback as any);
    } else {
      this.connect()?.off(event);
    }
  }

  /**
   * Emite um evento para o servidor.
   * @param event - O nome do evento a ser emitido.
   * @param data - Os dados a serem enviados com o evento (opcional).
   */
  emit<T>(event: string, data?: T): void {
    this.connect()?.emit(event, data);
  }

  // --- Métodos específicos do Chat ---

  /**
   * Tenta autenticar o usuário para o serviço de chat.
   * @param token - O token JWT do usuário.
   */
  authenticateChat(token: string): void {
    this.emit("chat:authenticate", { token, cid: this.cid });
  }

  /**
   * Envia uma mensagem de chat.
   * @param text - O conteúdo da mensagem.
   */
  sendMessage(text: string): void {
    this.emit("chat:sendMessage", { text });
  }

  /**
   * Registra um listener para o evento de sucesso na autenticação do chat.
   */
  onChatAuthSuccess(callback: () => void): void {
    this.on<void>("chat:auth_success", callback);
  }

  /**
   * Registra um listener para o evento de falha na autenticação do chat.
   */
  onChatAuthFailed(callback: (error: { message: string }) => void): void {
    this.on<{ message: string }>("chat:auth_failed", callback);
  }

  /**
   * Registra um listener para receber o histórico do chat.
   */
  onChatHistory(callback: (history: ChatMessage[]) => void): void {
    this.on<ChatMessage[]>("chat:history", callback);
  }

  /**
   * Registra listener para falha no download do histórico.
   */
  onChatHistoryError(callback: () => void): void {
    this.on<void>("chat:history_error", callback);
  }

  /**
   * Pede repescagem do histórico sem refazer a autenticação.
   */
  requestHistory(): void {
    this.emit("chat:request_history");
  }

  /**
   * Registra um listener para receber novas mensagens do chat.
   */
  onMessageReceived(callback: (message: ChatMessage) => void): void {
    this.on<ChatMessage>("chat:message", callback);
  }

  // --- Métodos específicos do Chat de Recuperação ---

  authenticateRecovery(token: string): void {
    this.emit("recovery:authenticate", { token, cid: this.cid });
  }

  sendRecoveryMessage(text: string): void {
    this.emit("recovery:sendMessage", { text });
  }

  onRecoveryAuthSuccess(callback: () => void): void {
    this.on<void>("recovery:auth_success", callback);
  }

  onRecoveryHistory(callback: (history: ChatMessage[]) => void): void {
    this.on<ChatMessage[]>("recovery:history", callback);
  }

  onRecoveryMessageReceived(callback: (message: ChatMessage) => void): void {
    this.on<ChatMessage>("recovery:message", callback);
  }

  onRecoveryUsers(callback: (users: any[]) => void): void {
    this.on<any[]>("recovery:users", callback);
  }

  // --- Métodos específicos do Chat de Isolamento ---

  authenticateIsolation(token: string): void {
    this.emit("isolation:authenticate", { token, cid: this.cid });
  }

  sendIsolationMessage(text: string): void {
    this.emit("isolation:sendMessage", { text });
  }

  onIsolationAuthSuccess(callback: () => void): void {
    this.on<void>("isolation:auth_success", callback);
  }

  onIsolationHistory(callback: (history: ChatMessage[]) => void): void {
    this.on<ChatMessage[]>("isolation:history", callback);
  }

  onIsolationMessageReceived(callback: (message: ChatMessage) => void): void {
    this.on<ChatMessage>("isolation:message", callback);
  }

  onIsolationUsers(callback: (users: any[]) => void): void {
    this.on<any[]>("isolation:users", callback);
  }

  // --- Métodos específicos do Chat Global (Zona Social) ---

  authenticateGlobal(token: string): void {
    this.emit("global:authenticate", { token, cid: this.cid });
  }

  sendGlobalMessage(text: string): void {
    this.emit("global:sendMessage", { text });
  }

  onGlobalAuthSuccess(callback: () => void): void {
    this.on<void>("global:auth_success", callback);
  }

  onGlobalHistory(callback: (history: ChatMessage[]) => void): void {
    this.on<ChatMessage[]>("global:history", callback);
  }

  onGlobalMessageReceived(callback: (message: ChatMessage) => void): void {
    this.on<ChatMessage>("global:message", callback);
  }

  onGlobalUsers(callback: (users: any[]) => void): void {
    this.on<any[]>("global:users", callback);
  }

  // --- SÊNIOR: Handler de Sessão Duplicada (Anti-Multi-Aba) ---
  onDuplicateSession(callback: (data: { message: string }) => void): void {
    this.on<{ message: string }>("socket:duplicate_session", (data) => {
      // Quando tomar kick, desabilita a reconexão automática para evitar ping-pong loop no mobile
      if (this.socket && this.socket.io) {
        this.socket.io.reconnection(false);
        this.socket.disconnect();
      }
      callback(data);
    });
  }
}

// Exporta uma instância única (singleton) do serviço
export const socketService = new SocketService();

// Exporta os tipos para serem usados em outros lugares da aplicação
export type { GameState, ServerTime, ChatMessage };
