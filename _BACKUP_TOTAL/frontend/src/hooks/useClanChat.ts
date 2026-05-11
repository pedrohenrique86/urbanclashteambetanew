import { useChat } from "../contexts/ChatContext";

/**
 * Hook customizado para acessar o contexto do chat do clã.
 * Fornece uma abstração e um ponto de acesso único para o estado do chat.
 */
export const useClanChat = () => {
  return useChat();
};