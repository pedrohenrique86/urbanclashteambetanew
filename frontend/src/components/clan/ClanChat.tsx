import React, { useState, useEffect, useRef } from "react";
import { useClanChat } from "../../hooks/useClanChat";
import { useUserProfile } from "../../hooks/useUserProfile";
import { Send } from "lucide-react"; // Usando um ícone para o botão de enviar

export const ClanChat: React.FC = () => {
  const { messages, onlineStatus, sendMessage, isConnected } = useClanChat();
  const { userProfile } = useUserProfile();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false); // Estado para o cooldown
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newMessage.trim() &&
      newMessage.length <= 100 && // Limite atualizado
      isConnected &&
      !isSending // Verifica se não está em cooldown
    ) {
      sendMessage(newMessage);
      setNewMessage("");
      setIsSending(true); // Ativa o cooldown
      setTimeout(() => setIsSending(false), 5000); // Desativa após 5s
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col h-96 w-full max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-full text-gray-400">
          Conectando ao chat...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg">
      {/* Cabeçalho do Chat */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h3 className="font-bold text-white">Chat do Clã</h3>
        <div className="text-sm text-green-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="ml-2">{onlineStatus.onlineCount} Online</span>
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 ${msg.userId === userProfile?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.userId === userProfile?.id ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"}`}
            >
              {msg.userId !== userProfile?.id && (
                <p className="text-xs font-bold text-green-300">
                  {msg.username}
                </p>
              )}
              <p className="text-sm break-words">{msg.text}</p>
              <p className="text-xs text-right mt-1 opacity-60">
                {new Date(msg.timestamp).toLocaleString([], {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulário de Envio */}
      <div className="p-3 border-t border-gray-700">
        <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
            maxLength={100} // Limite visual, um pouco maior que o real
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors w-24 flex items-center justify-center" // Largura fixa
            disabled={
              !isConnected ||
              !newMessage.trim() ||
              newMessage.length > 100 || // Limite atualizado
              isSending // Desabilita durante o cooldown
            }
          >
            {isSending ? "Aguarde..." : <Send size={20} />}
          </button>
        </form>
        {/* Contador de Caracteres */}
        <p
          className={`text-xs text-right mt-1 pr-4 ${
            newMessage.length > 100 ? "text-red-500" : "text-gray-400"
          }`}
        >
          {newMessage.length}/100
        </p>
      </div>
    </div>
  );
};
