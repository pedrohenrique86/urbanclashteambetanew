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

    if (userProfile && token) {
      console.log(
        "[ChatContext] Usuário logado, tentando autenticar o chat...",
      );
      socketService.authenticateChat(token);

      const handleAuthSuccess = () => {
        console.log("[ChatContext] Autenticação do chat bem-sucedida.");
        setIsConnected(true);

        // Registra os listeners de chat APÓS a autenticação
        socketService.onChatHistory(handleChatHistory);
        socketService.onMessageReceived(handleNewMessage);
        socketService.onOnlineStatus(handleOnlineStatus);
      };

      const handleAuthFailed = (error: { message: string }) => {
        console.error(
          "[ChatContext] Falha na autenticação do chat:",
          error.message,
        );
        setIsConnected(false);
      };

      // Registra os listeners de autenticação
      socketService.onChatAuthSuccess(handleAuthSuccess);
      socketService.onChatAuthFailed(handleAuthFailed);

      // Função de limpeza
      return () => {
        console.log("[ChatContext] Limpando listeners do chat.");
        socketService.off("chat:auth_success", handleAuthSuccess);
        socketService.off("chat:auth_failed", handleAuthFailed);

        // Remove os outros listeners apenas se a conexão foi estabelecida
        if (isConnected) {
          socketService.off("chat:history", handleChatHistory);
          socketService.off("chat:message", handleNewMessage);
          socketService.off("chat:onlineStatus", handleOnlineStatus);
        }
      };
    } else {
      // Garante que o estado de conexão seja falso se não houver usuário/token
      setIsConnected(false);
    }
    // Adicionado isConnected às dependências para re-executar a limpeza corretamente
  }, [
    userProfile,
    handleChatHistory,
    handleNewMessage,
    handleOnlineStatus,
    isConnected,
  ]);

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
