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
      // Se existe um perfil, deve haver um token
      console.log("[ChatContext] Autenticado, juntando-se ao chat...");
      socketService.joinChat(token);
      setIsConnected(true);

      // Registra os listeners uma vez
      socketService.onChatHistory(handleChatHistory);
      socketService.onMessageReceived(handleNewMessage);
      socketService.onOnlineStatus(handleOnlineStatus);

      return () => {
        // A lógica de limpeza é gerenciada pelo socketService
      };
    }
  }, [userProfile, handleChatHistory, handleNewMessage, handleOnlineStatus]); // Dependência em userProfile para reavaliar quando o usuário logar/deslogar

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
