import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { socketService, ChatMessage } from "../services/socketService";
import { useUserProfile } from "../hooks/useUserProfile";
import { apiClient } from "../lib/supabaseClient"; // Importar o apiClient
import { playMentionSound } from "../lib/audio";

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// --- Utilitários fora do componente para evitar recriação em re-render ---
const getMessageKey = (msg: ChatMessage) => {
  // Prioridade total para o ID robusto vindo do backend
  if (msg.id) return String(msg.id);

  const ts =
    typeof msg.timestamp === "number"
      ? msg.timestamp
      : new Date(msg.timestamp).getTime();

  // Fallback seguro apenas para mensagens legadas
  return `${ts}-${msg.userId}-${msg.text}`;
};

const mergeAndSortMessages = (
  current: ChatMessage[],
  incoming: ChatMessage[],
) => {
  const uniqueMap = new Map<string, ChatMessage>();

  [...current, ...incoming].forEach((msg) => {
    const key = getMessageKey(msg);
    if (key) uniqueMap.set(key, msg);
  });

  return Array.from(uniqueMap.values())
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();

      if (ta !== tb) return ta - tb;
      return getMessageKey(a).localeCompare(getMessageKey(b));
    })
    .slice(-20); // Padronizado em 20 mensagens
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useUserProfile(); // Continuamos usando para saber SE o usuário está logado
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const historyRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRetriedHistoryRef = useRef(false);

  // Limpeza imediata do histórico local ao trocar de clã, evitando flash visual de mensagens antigas
  useEffect(() => {
    setMessages([]);
    hasRetriedHistoryRef.current = false;
    if (historyRetryTimeoutRef.current) {
      clearTimeout(historyRetryTimeoutRef.current);
      historyRetryTimeoutRef.current = null;
    }
  }, [userProfile?.clan_id]);

  const userProfileRef = useRef(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // Envolve os handlers com useCallback para estabilizar suas referências.
  // Isso é crucial para usá-los como dependências no useEffect sem causar re-execuções indesejadas.
  // Utiliza as funções isoladas fora do componente, 100% livres de dependências extras
  const handleNewMessage = useCallback((message: ChatMessage) => {
    const currentProfile = userProfileRef.current;
    if (currentProfile && message.text.toLowerCase().includes(`@${currentProfile.username.toLowerCase()}`)) {
      playMentionSound();
    }

    setMessages((prev) => {
      const newKey = getMessageKey(message);
      
      // Fast-path: deduplicação simples e barata
      if (prev.some((msg) => getMessageKey(msg) === newKey)) {
        return prev;
      }
      
      // Inserção O(1) no final (mensagens em tempo real assumem o tempo presente)
      const next = [...prev, message];
      
      // Mantém o limite rígido de 20 mensagens sem sort pesado
      return next.length > 20 ? next.slice(-20) : next;
    });
  }, []);

  const handleChatHistory = useCallback((history: ChatMessage[]) => {
    hasRetriedHistoryRef.current = false;
    setMessages((prev) => mergeAndSortMessages(prev, history));
  }, []);

  useEffect(() => {
    if (!userProfile?.id || !userProfile?.clan_id) {
      setIsConnected(false);
      return;
    }

    // SÊNIOR: Sempre reseta conexão ao trocar de clã para evitar enviar msg para a sala errada
    setIsConnected(false);
    setMessages([]);

    const token = apiClient.getToken();
    if (!token) {
      if (import.meta.env.DEV) {
        console.debug("[ChatContext] Usuário detectado, mas sem token.");
      }
      setIsConnected(false);
      return;
    }

    // --- Lógica de Autenticação e Listeners ---
    
    const handleAuthSuccess = () => {
      if (import.meta.env.DEV) console.debug("[ChatContext] Chat autenticado com sucesso no socket.");
      setIsConnected(true);
    };

    const handleAuthFailed = (error: { message: string }) => {
      const isExpectedError = 
        error.message.includes("Usuário inválido ou sem clã") || 
        error.message.includes("Você não pertence a uma divisão") ||
        error.message.includes("Acesso negado: Você não pertence a este clã");

      if (isExpectedError) {
        if (import.meta.env.DEV) console.debug("[ChatContext] Auth abortada (usuário ainda sem clã).");
      } else {
        console.error("[ChatContext] Falha real na autenticação do chat:", error.message);
      }
      setIsConnected(false);
    };

    // SÊNIOR: Dispara a autenticação do chat. Isolado para reuso em reconexões.
    const performChatAuth = () => {
      const currentToken = apiClient.getToken();
      if (currentToken) {
        if (import.meta.env.DEV) console.debug("[ChatContext] Solicitando autenticação de chat...");
        socketService.authenticateChat(currentToken);
      }
    };

    // Dispara 1 único retry tardio (Timeout age como break temporal pra recuperação do banco)
    const handleHistoryError = () => {
      if (hasRetriedHistoryRef.current) return;
      hasRetriedHistoryRef.current = true;

      if (historyRetryTimeoutRef.current) {
        clearTimeout(historyRetryTimeoutRef.current);
      }

      if (import.meta.env.DEV) {
        console.warn("[ChatContext] Backend sinalizou falha no histórico. Tentando repescagem em 2s...");
      }
      historyRetryTimeoutRef.current = setTimeout(() => {
        socketService.requestHistory();
        historyRetryTimeoutRef.current = null;
      }, 2000);
    };

    const handleHistoryCleared = (data: { message: string }) => {
      if (import.meta.env.DEV) console.debug("[ChatContext] " + data.message);
      setMessages([]);
    };

    // Registra TODOS os listeners ANTES de disparar a autenticação.
    socketService.on("connect", performChatAuth); // SÊNIOR: Re-autentica ao reconectar
    socketService.onChatAuthSuccess(handleAuthSuccess);
    socketService.onChatAuthFailed(handleAuthFailed);
    socketService.onChatHistory(handleChatHistory);
    socketService.onChatHistoryError(handleHistoryError);
    socketService.onMessageReceived(handleNewMessage);
    socketService.onChatHistoryCleared(handleHistoryCleared);

    // Tenta autenticar imediatamente (se o socket já estiver aberto)
    performChatAuth();

    // Limpeza de listeners para evitar duplicatas e vazamentos de memória
    return () => {
      if (historyRetryTimeoutRef.current) {
        clearTimeout(historyRetryTimeoutRef.current);
        historyRetryTimeoutRef.current = null;
      }
      socketService.off("connect", performChatAuth);
      socketService.off("chat:auth_success", handleAuthSuccess);
      socketService.off("chat:auth_failed", handleAuthFailed);
      socketService.off("chat:history", handleChatHistory);
      socketService.off("chat:history_error", handleHistoryError);
      socketService.off("chat:message", handleNewMessage);
      socketService.off("chat:history_cleared", handleHistoryCleared);
      setIsConnected(false);
    };
    // A dependência agora inclui o clan_id do usuário, que é fundamental.
    // O useEffect será re-executado quando o usuário fizer login, logout, ou entrar/sair de um clã.
  }, [userProfile?.id, userProfile?.clan_id, handleChatHistory, handleNewMessage]);

  const sendMessage = useCallback((text: string) => {
    if (text.trim()) {
      socketService.sendMessage(text);
    }
  }, []);

  const contextValue = useMemo(
    () => ({ messages, sendMessage, isConnected }),
    [messages, sendMessage, isConnected]
  );

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat deve ser usado dentro de um ChatProvider");
  }
  return context;
};
