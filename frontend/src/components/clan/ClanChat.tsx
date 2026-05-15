import React, { useState, useEffect, useRef } from "react";
import { useClanChat } from "../../hooks/useClanChat";
import { useUserProfile } from "../../hooks/useUserProfile";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Terminal, 
  Wifi, 
  WifiOff, 
  AtSign, 
  Clock, 
  MessageSquare,
  Shield,
  Skull,
  Activity
} from "lucide-react";
import { getFactionColor } from "../../pages/RecoveryBasePage";

interface ClanMember {
  username: string;
  faction?: string;
}

interface ClanChatProps {
  members?: ClanMember[];
}

const MessageList = React.memo(function MessageList({ messages, userProfile, chatContainerRef, messagesEndRef }: any) {
  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\u00C0-\u017F]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const isMentioningMe =
          userProfile && part.toLowerCase() === `@${userProfile.username.toLowerCase()}`;
        return (
          <span
            key={i}
            className={`font-black ${
              isMentioningMe
                ? "text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30 shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                : "text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]"
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar bg-black/20"
    >
      <div className="flex flex-col gap-3">
        {messages.map((msg: any, index: number) => {
          const isMe = msg.userId === userProfile?.id;
          const displayUsername = msg.username || (isMe ? userProfile?.username : 'Membro');
          
          const factionColor = getFactionColor(msg.faction);

          return (
            <motion.div 
              initial={{ opacity: 0, x: isMe ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={index} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                 <span className={`text-[9px] font-black font-orbitron ${factionColor} uppercase tracking-widest`}>
                    {displayUsername}
                 </span>
                 <div className="w-1 h-1 rounded-full bg-zinc-800" />
                 <span className="text-[8px] font-mono text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                 </span>
              </div>
              
              <div className={`relative max-w-[85%] px-4 py-2.5 rounded-xl border ${isMe ? 'bg-zinc-900/80 border-white/10 rounded-tr-none shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-black/40 border-white/5 rounded-tl-none shadow-[0_0_10px_rgba(0,0,0,0.3)]'} transition-all group-hover:border-white/20 group-hover:bg-zinc-900/90`}>
                 <p className="text-sm text-zinc-200 leading-relaxed break-words font-medium tracking-tight">
                    {renderMessageText(msg.text)}
                 </p>
                 {/* Visual Accent */}
                 <div className={`absolute top-0 ${isMe ? 'right-0' : 'left-0'} w-1.5 h-1.5 ${isMe ? 'bg-zinc-700 shadow-[0_0_5px_rgba(255,255,255,0.3)]' : 'bg-zinc-800'} rounded-full -translate-x-1/2 -translate-y-1/2 border border-zinc-950`} />
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

export const ClanChat: React.FC<ClanChatProps> = ({ members = [] }) => {
  const { messages, sendMessage, isConnected } = useClanChat();
  const { userProfile } = useUserProfile();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (showMentions && filteredMembers.length > 0) {
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
      setTimeout(() => setIsSending(false), 1000);
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

  return (
    <div className="flex flex-col h-[500px] sm:h-full w-full bg-transparent overflow-hidden relative">
      {/* Cinematic Glitch/Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[5] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* Header HUD */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
           <div className={`p-1.5 rounded bg-zinc-900 border border-white/5`}>
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
           </div>
            <div className="flex flex-col">
              <h3 className="font-orbitron font-black text-[10px] text-white tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">CANAL_VOZ_INTERNO</h3>
              <div className="flex items-center gap-1.5">
                 <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                 <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isConnected ? 'text-green-500/80' : 'text-red-500/80'}`}>
                    {isConnected ? 'SISTEMA_SINCRONIZADO' : 'CONEXÃO_INTERROMPIDA'}
                 </span>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <Activity className="w-3 h-3 text-zinc-700" />
           <span className="text-[8px] font-mono text-zinc-600">v1.2.0_ELITE</span>
        </div>
      </div>

      <MessageList
        messages={messages}
        userProfile={userProfile}
        chatContainerRef={chatContainerRef}
        messagesEndRef={messagesEndRef}
      />

      {/* Mention Box */}
      <AnimatePresence>
        {showMentions && filteredMembers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-20 left-4 w-64 max-h-48 overflow-y-auto bg-zinc-900/95 border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[60] backdrop-blur-md"
          >
            <div className="p-2 border-b border-white/5 bg-white/[0.02]">
               <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">MENTION_SYSTEM</span>
            </div>
            {filteredMembers.map((member, i) => (
              <div
                key={i}
                className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  mentionIndex === i
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5"
                }`}
                onClick={() => insertMention(member.username)}
              >
                <div className={`w-1 h-1 rounded-full ${getFactionColor(member.faction).replace('text-', 'bg-')}`} />
                <span className={`text-xs font-orbitron font-bold ${getFactionColor(member.faction)}`}>{member.username}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input HUD Area */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 relative">
        <form className="flex items-center gap-3" onSubmit={handleSendMessage}>
          <div className="relative flex-1 group">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <AtSign className={`w-3.5 h-3.5 ${newMessage.includes('@') ? 'text-blue-500' : 'text-zinc-600'} transition-colors`} />
             </div>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="TRANSMITIR MENSAGEM... (@ marca usuário)"
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 pl-11 pr-16 text-xs text-white placeholder-zinc-700 font-medium focus:outline-none focus:border-white/30 transition-all focus:bg-black/80 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] shadow-inner"
                disabled={!isConnected}
                maxLength={100}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black font-mono text-zinc-600 select-none">
                 {newMessage.length}/100
              </div>
          </div>

          <button
            type="submit"
            className={`min-w-[60px] h-12 flex items-center justify-center rounded-xl transition-all duration-300 shadow-lg ${
              !isConnected || !newMessage.trim() || isSending 
                ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed grayscale' 
                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-white/5'
            }`}
            disabled={!isConnected || !newMessage.trim() || newMessage.length > 100 || isSending}
          >
            {isSending ? (
               <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            ) : (
               <Send size={18} className={!isConnected || !newMessage.trim() ? 'opacity-20' : 'opacity-100'} />
            )}
          </button>
        </form>

        {/* Technical Footer Labels */}
        <div className="mt-3 flex justify-between px-1">
           <div className="flex items-center gap-2">
              <Clock className="w-2.5 h-2.5 text-zinc-700" />
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">REALTIME_LINK_ACTIVE</span>
           </div>
           {isSending && (
              <motion.span 
                 animate={{ opacity: [1, 0.4, 1] }} 
                 transition={{ repeat: Infinity, duration: 1.5 }}
                 className="text-[7px] font-black text-zinc-600 uppercase tracking-widest"
              >
                 PROTOCOL.COOLDOWN_ACTIVE
              </motion.span>
           )}
        </div>
      </div>
    </div>
  );
};
