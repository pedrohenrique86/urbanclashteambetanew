// SÊNIOR: Serviço de WebSocket Nativo (High Performance)
// Substitui o socket.io-client para reduzir overhead no navegador.

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  faction?: string;
  country?: string;
  text: string;
  timestamp: string;
}

const VITE_API_URL = import.meta.env.VITE_API_URL as string;

class SocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  public readonly cid: string;
  private reconnectTimeout: any = null;
  private isConnecting: boolean = false;
  private heartbeatInterval: any = null;

  constructor() {
    let storedCid = localStorage.getItem("uc_socket_cid");
    if (!storedCid) {
      storedCid = `native-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("uc_socket_cid", storedCid);
    }
    this.cid = storedCid;
  }

  /**
   * Conecta ao servidor via WebSocket Nativo.
   */
  connect(): WebSocket | null {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return this.socket;
    }

    if (this.isConnecting) return null;
    this.isConnecting = true;

    // Converte HTTP URL para WS URL
    const wsUrl = (VITE_API_URL || "").replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const token = localStorage.getItem("token") || ""; // Pega o token atual
    
    const finalUrl = `${wsUrl}/socket?cid=${this.cid}&token=${encodeURIComponent(token)}`;

    console.log("🔌 Conectando WebSocket Nativo em:", wsUrl);

    try {
      this.socket = new WebSocket(finalUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log("🔌 WebSocket Conectado ✅");
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.trigger("connect", null);

        // Inicia Heartbeat (Ping) a cada 30s
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          this.emit("ping", { t: Date.now() });
        }, 30000);
      };

      this.socket.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          this.trigger(type, data);
        } catch (e) {
          // Ignora mensagens malformadas
        }
      };

      this.socket.onclose = (event) => {
        this.isConnecting = false;
        this.socket = null;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log("🔌 WebSocket Desconectado ❌", event.reason);
        this.trigger("disconnect", event.reason);
        
        // Reconexão automática com backoff simples
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };

      this.socket.onerror = (error) => {
        this.isConnecting = false;
        console.error("🔌 Erno no WebSocket:", error);
      };
    } catch (err) {
      this.isConnecting = false;
      console.error("🔌 Falha crítica ao criar WebSocket:", err);
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
  }

  on<T>(event: string, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Auto-connect se alguém começar a ouvir
    this.connect();
  }

  off<T>(event: string, callback?: (data: T) => void): void {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event)!.delete(callback);
      } else {
        this.listeners.delete(event);
      }
    }
  }

  emit<T>(type: string, data?: T): void {
    const ws = this.connect();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    } else {
      // Se não estiver aberto, tenta conectar e ignora por agora (ou poderia enfileirar)
      console.warn(`[WS] Não enviado: ${type} (Socket não pronto)`);
    }
  }

  private trigger(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // --- MÉTODOS DE COMPATIBILIDADE (Mantidos para não quebrar o frontend) ---

  authenticateChat(token: string): void {
    this.emit("chat:authenticate", { token, cid: this.cid });
  }

  sendMessage(text: string): void {
    this.emit("chat:sendMessage", { text });
  }

  onChatAuthSuccess(callback: () => void): void {
    this.on<void>("chat:auth_success", callback);
  }

  onChatAuthFailed(callback: (error: { message: string }) => void): void {
    this.on<{ message: string }>("chat:auth_failed", callback);
  }

  onChatHistory(callback: (history: ChatMessage[]) => void): void {
    this.on<ChatMessage[]>("chat:history", callback);
  }

  onMessageReceived(callback: (message: ChatMessage) => void): void {
    this.on<ChatMessage>("chat:message", callback);
  }

  requestHistory(): void {
    this.emit("chat:request_history");
  }

  onDuplicateSession(callback: (data: { message: string }) => void): void {
    this.on<{ message: string }>("session_duplicate", callback);
  }

  // Isolation
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

  // Recovery
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

  // Global
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
}

export const socketService = new SocketService();
export type { ChatMessage };
