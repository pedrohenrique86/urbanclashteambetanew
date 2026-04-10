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
} from "../services/socketService";
import { useUserProfile } from "../hooks/useUserProfile";
import { apiClient } from "../lib/supabaseClient"; // Importar o apiClient

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useUserProfile(); // Continuamos usando para saber SE o usuário está logado
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Envolve os handlers com useCallback para estabilizar suas referências.
  // Isso é crucial para usá-los como dependências no useEffect sem causar re-execuções indesejadas.
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const handleChatHistory = useCallback((history: ChatMessage[]) => {
    setMessages(history);
  }, []);



  useEffect(() => {
    const token = apiClient.getToken();

    if (!userProfile || !token) {
      setIsConnected(false);
      return;
    }

    // --- Lógica de Autenticação e Listeners ---
    console.log(
      "[ChatContext] Usuário detectado, tentando autenticar o chat...",
    );
    socketService.authenticateChat(token);

    const handleAuthSuccess = () => {
      console.log(
        "[ChatContext] Autenticação bem-sucedida. Registrando listeners...",
      );
      setIsConnected(true);

      // Registra os listeners SOMENTE após a autenticação
      socketService.onChatHistory(handleChatHistory);
      socketService.onMessageReceived(handleNewMessage);
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

    // A função de limpeza remove todos os listeners para evitar duplicatas
    // e vazamentos de memória quando o usuário desloga.
    return () => {
      console.log("[ChatContext] Limpando todos os listeners do chat.");
      socketService.off("chat:auth_success", handleAuthSuccess);
      socketService.off("chat:auth_failed", handleAuthFailed);
      socketService.off("chat:history", handleChatHistory);
      socketService.off("chat:message", handleNewMessage);
      setIsConnected(false);
    };
    // Agora, com os callbacks memoizados, podemos adicioná-los ao array de dependências
    // para satisfazer a regra do ESLint sem reintroduzir o bug dos listeners múltiplos.
  }, [userProfile, handleChatHistory, handleNewMessage]);

  const sendMessage = (text: string) => {
    if (text.trim()) {
      socketService.sendMessage(text);
    }
  };

  return (
    <ChatContext.Provider
      value={{ messages, sendMessage, isConnected }}
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
