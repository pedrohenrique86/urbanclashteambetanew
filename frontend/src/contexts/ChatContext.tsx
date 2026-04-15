import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { socketService, ChatMessage } from "../services/socketService";
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
  // Cap de 20 mensagens no estado React.
  // Evita crescimento infinito do array durante sessões longas.
  // A fonte de verdade permanece o backend — este slice é apenas proteção de memória no browser.
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages((prevMessages) => [...prevMessages, message].slice(-20));
  }, []);

  const handleChatHistory = useCallback((history: ChatMessage[]) => {
    // O backend já retorna no máximo 20 msgs válidas, mas slice(-20) garante
    // consistência mesmo que a resposta venha com mais entradas por qualquer motivo.
    setMessages(history.slice(-20));
  }, []);

  useEffect(() => {
    // A lógica do chat só precisa saber SE há um usuário e qual o token.
    // Depender do ID do perfil é mais estável do que depender do objeto inteiro.
    if (!userProfile?.id) {
      setIsConnected(false);
      return;
    }

    const token = apiClient.getToken();
    if (!token) {
      console.warn(
        "[ChatContext] Usuário detectado, mas sem token. O chat não pode autenticar.",
      );
      setIsConnected(false);
      return;
    }

    // --- Lógica de Autenticação e Listeners ---
    socketService.authenticateChat(token);

    const handleAuthSuccess = () => {
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
      socketService.off("chat:auth_success", handleAuthSuccess);
      socketService.off("chat:auth_failed", handleAuthFailed);
      socketService.off("chat:history", handleChatHistory);
      socketService.off("chat:message", handleNewMessage);
      setIsConnected(false);
    };
    // A dependência agora inclui o clan_id do usuário, que é fundamental.
    // O useEffect será re-executado quando o usuário fizer login, logout, ou entrar/sair de um clã.
  }, [userProfile?.id, userProfile?.clan_id, handleChatHistory, handleNewMessage]);

  const sendMessage = (text: string) => {
    if (text.trim()) {
      socketService.sendMessage(text);
    }
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, isConnected }}>
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
