import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import {
  socketService,
  ChatMessage,
  OnlineStatus,
} from "../services/socketService";
import { useUserProfile } from "../hooks/useUserProfile";
import { apiClient } from "../lib/supabaseClient"; // Importar o apiClient

interface ChatContextType {
  messages: ChatMessage[];
  onlineStatus: OnlineStatus;
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useUserProfile(); // Continuamos usando para saber SE o usuário está logado
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({
    onlineUsers: [],
    onlineCount: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const handleChatHistory = useCallback((history: ChatMessage[]) => {
    setMessages(history);
  }, []);

  const handleOnlineStatus = useCallback((status: OnlineStatus) => {
    setOnlineStatus(status);
  }, []);

  useEffect(() => {
    const token = apiClient.getToken();

    // Se não há usuário ou token, não faz nada.
    if (!userProfile || !token) {
      setIsConnected(false);
      return;
    }

    // --- Lógica de Autenticação ---
    // Esta parte só roda quando o perfil do usuário muda.
    console.log(
      "[ChatContext] Usuário detectado, tentando autenticar o chat...",
    );
    socketService.authenticateChat(token);

    const handleAuthSuccess = () => {
      console.log("[ChatContext] Autenticação do chat bem-sucedida.");
      setIsConnected(true);
    };

    const handleAuthFailed = (error: { message: string }) => {
      console.error(
        "[ChatContext] Falha na autenticação do chat:",
        error.message,
      );
      setIsConnected(false);
    };

    socketService.onChatAuthSuccess(handleAuthSuccess);
    socketService.onChatAuthFailed(handleAuthFailed);

    // --- Lógica de Listeners de Mensagem ---
    // Estes listeners são registrados uma vez e usam as funções memoizadas.
    socketService.onChatHistory(handleChatHistory);
    socketService.onMessageReceived(handleNewMessage);
    socketService.onOnlineStatus(handleOnlineStatus);

    // A função de limpeza é crucial. Ela remove TODOS os listeners quando
    // o usuário desloga (o componente é desmontado ou o userProfile muda).
    return () => {
      console.log("[ChatContext] Limpando todos os listeners do chat.");
      socketService.off("chat:auth_success", handleAuthSuccess);
      socketService.off("chat:auth_failed", handleAuthFailed);
      socketService.off("chat:history", handleChatHistory);
      socketService.off("chat:message", handleNewMessage);
      socketService.off("chat:onlineStatus", handleOnlineStatus);
      setIsConnected(false); // Garante o estado limpo
    };
  }, [userProfile, handleChatHistory, handleNewMessage, handleOnlineStatus]);

  const sendMessage = (text: string) => {
    if (text.trim()) {
      socketService.sendMessage(text);
    }
  };

  return (
    <ChatContext.Provider
      value={{ messages, onlineStatus, sendMessage, isConnected }}
    >
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
