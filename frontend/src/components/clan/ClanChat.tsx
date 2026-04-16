import React, { useState, useEffect, useRef } from "react";
import { useClanChat } from "../../hooks/useClanChat";
import { useUserProfile } from "../../hooks/useUserProfile";
import { Send } from "lucide-react"; // Usando um ícone para o botão de enviar

interface ClanMember {
  username: string;
}

interface ClanChatProps {
  members?: ClanMember[];
}

export const ClanChat: React.FC<ClanChatProps> = ({ members = [] }) => {
  const { messages, sendMessage, isConnected } = useClanChat();
  const { userProfile } = useUserProfile();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false); // Estado para o cooldown
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (showMentions && filteredMembers.length > 0) {
      // Prevent form submit if selecting a mention via enter
      insertMention(filteredMembers[mentionIndex].username);
      return;
    }
    
    if (
      newMessage.trim() &&
      newMessage.length <= 100 &&
      isConnected &&
      !isSending
    ) {
      sendMessage(newMessage);
      setNewMessage("");
      setShowMentions(false);
      setIsSending(true);
      setTimeout(() => setIsSending(false), 5000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u00C0-\u017F]*)$/);
    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    const cursorPosition = inputRef.current?.selectionStart || newMessage.length;
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const textAfterCursor = newMessage.slice(cursorPosition);
    
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z0-9_\u00C0-\u017F]*$/, `@${username} `);
    
    setNewMessage(newTextBefore + textAfterCursor);
    setShowMentions(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const filteredMembers = members.filter((m) =>
    m.username.toLowerCase().includes(mentionFilter)
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i < filteredMembers.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i > 0 ? i - 1 : filteredMembers.length - 1));
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\u00C0-\u017F]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const isMentioningMe =
          userProfile && part.toLowerCase() === `@${userProfile.username.toLowerCase()}`;
        return (
          <span
            key={i}
            className={`font-bold ${
              isMentioningMe
                ? "text-yellow-400 bg-yellow-400/20 px-1 rounded"
                : "text-yellow-300"
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
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
        <h3 className="font-bold text-white flex items-center gap-2">
          Chat do Clã
          <span className="text-white/60 text-[10px] font-normal uppercase tracking-wider">
            | Mensagens serão apagadas após 24h
          </span>
        </h3>
      </div>

      <div className="flex-1 p-3 overflow-y-auto bg-gray-900/50 rounded-md m-3 space-y-1">
        {messages.map((msg, index) => {
          const isMe = msg.userId === userProfile?.id;
          const displayUsername = msg.username || (isMe ? userProfile?.username : 'Membro');
          
          return (
            <div key={index} className="text-sm break-words leading-relaxed">
              <span className={`font-bold ${isMe ? "text-blue-400" : "text-green-400"}`}>
                {displayUsername}
              </span>
              <span className="text-gray-500 text-xs mx-1">
                {new Date(msg.timestamp).toLocaleString([], {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-gray-300">
                : {renderMessageText(msg.text)}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulário de Envio, Menções e Contador */}
      <div className="p-3 border-t border-gray-700 relative">
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-3 mb-2 w-64 max-h-48 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
            {filteredMembers.map((member, i) => (
              <div
                key={i}
                className={`px-4 py-2 cursor-pointer ${
                  mentionIndex === i
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => insertMention(member.username)}
              >
                {member.username}
              </div>
            ))}
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... Use @ para marcar alguém"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
            maxLength={100}
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
