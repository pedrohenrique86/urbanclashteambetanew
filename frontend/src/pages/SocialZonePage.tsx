import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  HashtagIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { useUserProfile } from "../hooks/useUserProfile";
import { useHUD } from "../contexts/HUDContext";
import { tokenStorage } from "../lib/api";
import { socketService, ChatMessage } from "../services/socketService";
import { format } from "date-fns";
import { getFactionColor } from "./RecoveryBasePage";
import { playMentionSound } from "../lib/audio";

import { Avatar } from "../components/ui/Avatar";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function SocialZonePage() {
  const { userProfile } = useUserProfile();
  const { openUserPanel } = useHUD();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isCooldown, setIsCooldown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subtitle = "FREQUÊNCIA GLOBAL UNIFICADA. TRANSMISSÃO CRIPTOGRAFADA EM TEMPO REAL.";

  const userProfileRef = useRef(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    const token = tokenStorage.getToken();
    if (!token) return;

    socketService.onGlobalHistory((history) => setMessages(history));
    socketService.onGlobalMessageReceived((msg) => {
      const currentProfile = userProfileRef.current;
      if (currentProfile && msg.text.toLowerCase().includes(`@${currentProfile.username.toLowerCase()}`)) {
        playMentionSound();
      }
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev.slice(-29), msg];
      });
    });
    socketService.onGlobalUsers((users) => setOnlineUsers(users));

    const timer = setTimeout(() => {
      socketService.authenticateGlobal(token);
    }, 500);

    return () => {
      clearTimeout(timer);
      setMessages([]);
      setOnlineUsers([]);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Mention System State ---
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = useMemo(() => {
    return onlineUsers.filter((u) =>
      u.username.toLowerCase().includes(mentionFilter.toLowerCase())
    );
  }, [onlineUsers, mentionFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPosition);
    
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u00C0-\u017F]*)$/);
    if (match) {
      setMentionFilter(match[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i < filteredUsers.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i > 0 ? i - 1 : filteredUsers.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex].username);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    }
  };

  const insertMention = (username: string) => {
    const cursorPosition = inputRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z0-9_\u00C0-\u017F]*$/, `@${username} `);
    
    setInputText(newTextBefore + textAfterCursor);
    setShowMentions(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\u00C0-\u017F]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const cleanMention = part.substring(1);
        const isMe = userProfile && cleanMention.toLowerCase() === userProfile.username.toLowerCase();
        return (
          <span
            key={i}
            className={`font-black px-1 rounded ${
              isMe
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                : "text-violet-400 drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]"
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isCooldown) return;

    if (showMentions && filteredUsers.length > 0) {
      insertMention(filteredUsers[mentionIndex].username);
      return;
    }
    
    socketService.sendGlobalMessage(inputText);
    setInputText("");
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 3000);
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-violet-500/30">
      
      {/* HUD DECORATION - CORNERS (Exact match to Training Page) */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-violet-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-violet-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-violet-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-violet-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-violet-500/50"></div>
      </div>

      {/* HEADER (Exact match to Training Page style) */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(139,92,246,0.7), -2px 0px 0px rgba(34,211,238,0.7)" }}>
            Social <span className="text-violet-400">Zone</span> HUB
          </h1>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-violet-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-violet-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">COMM_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-violet-400 font-bold tracking-widest">GLOBAL_AUTH_ENCRYPTED</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-violet-400/80 animate-pulse tracking-widest font-bold uppercase">● Uplink_Established</span>
            </div>
            
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-violet-500/50 w-fit backdrop-blur-sm">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto relative z-10">
        
        {/* UNIFIED CONTAINER */}
        <div className="flex flex-col md:flex-row h-[650px] cyber-card cyber-card-violet bg-black/60 border-white/5 relative overflow-hidden" style={MILITARY_CLIP}>
          
          {/* LEFT: CHAT AREA (3/4 on desktop) */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-white/10">
            {/* CHAT HEADER */}
            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HashtagIcon className="w-4 h-4 text-violet-400" />
                <h3 className="font-orbitron font-black text-white text-[10px] uppercase tracking-widest italic">Global_Frequence_Protocol</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 bg-violet-500/10 px-3 py-1 border border-violet-500/20">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-tighter">Live_Uplink</span>
                </div>
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-violet-500/5">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-500 mb-4" />
                  <p className="text-[10px] font-orbitron uppercase tracking-[0.4em]">Aguardando Sincronização...</p>
                </div>
              )}
              
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4 items-start group"
                  >
                    <Avatar 
                      src={msg.avatar} 
                      className="w-10 h-10 group-hover:border-violet-500/50 transition-colors cursor-pointer" 
                      onClick={() => openUserPanel(msg.userId)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {msg.country && (
                          <img 
                            src={`https://flagcdn.com/w20/${msg.country.toLowerCase()}.png`} 
                            className="w-3 h-auto opacity-80" 
                            alt="flag" 
                          />
                        )}
                        <span 
                          className={`text-[10px] font-black uppercase italic tracking-tighter cursor-pointer hover:underline ${getFactionColor(msg.faction)}`}
                          onClick={() => openUserPanel(msg.userId)}
                        >
                          {msg.username}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">
                          [{format(new Date(msg.timestamp), "dd/MM/yyyy HH:mm")}]
                        </span>
                      </div>
                      <div 
                        className="bg-white/5 p-4 text-xs text-slate-300 border-l-2 border-violet-500/30 break-words group-hover:border-violet-500/50 transition-colors"
                        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}
                      >
                        {renderMessageText(msg.text)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* INPUT FORM */}
            <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
              <div className="flex-1 relative">
                <AnimatePresence>
                  {showMentions && filteredUsers.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 mb-2 w-48 bg-black/90 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.3)] max-h-40 overflow-y-auto custom-scrollbar z-50 rounded"
                    >
                      {filteredUsers.map((u, idx) => (
                        <div
                          key={u.id}
                          onClick={() => insertMention(u.username)}
                          className={`p-2 text-xs font-black uppercase italic cursor-pointer flex items-center gap-2 ${idx === mentionIndex ? 'bg-violet-500/30 text-white' : 'text-slate-400 hover:bg-violet-500/10 hover:text-white'}`}
                        >
                          {u.country && (
                            <img src={`https://flagcdn.com/w20/${u.country.toLowerCase()}.png`} className="w-3 h-auto" alt="flag" />
                          )}
                          {u.username}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <input 
                  ref={inputRef}
                  type="text"
                  maxLength={120}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isCooldown ? "Aguarde o cooldown..." : "Digitar transmissão global... (@ marca usuário)"}
                  disabled={isCooldown}
                  className="w-full bg-white/5 border border-white/10 px-5 py-3 pr-16 text-xs font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 transition-all disabled:opacity-50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400">
                  {inputText.length}/120
                </div>
              </div>
              <button 
                type="submit"
                disabled={isCooldown}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-orbitron font-black uppercase italic tracking-widest transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                style={MILITARY_CLIP}
              >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
              </button>
            </form>
          </div>

          {/* RIGHT: ONLINE USERS (Sidebar) */}
          <div className="w-full md:w-64 flex flex-col bg-black/20">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-violet-400" />
              <span className="text-[10px] font-orbitron font-bold text-white uppercase tracking-widest">Online ({onlineUsers.length})</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {onlineUsers.map(u => (
                <div 
                  key={u.id}
                  className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all group cursor-pointer"
                  style={MILITARY_CLIP}
                  onClick={() => openUserPanel(u.id)}
                >
                  <div className="relative">
                    <Avatar src={u.avatar} className="w-7 h-7" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-black animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {u.country && (
                      <img 
                        src={`https://flagcdn.com/w20/${u.country.toLowerCase()}.png`} 
                        className="w-2.5 h-auto opacity-70" 
                        alt="flag" 
                      />
                    )}
                    <span className={`text-[10px] font-black uppercase italic truncate group-hover:text-white transition-colors ${getFactionColor(u.faction)}`}>
                      {u.username}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* SYSTEM LOAD DECORATION */}
            <div className="p-4 bg-white/5 border-t border-white/10 mt-auto">
               <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-end text-[8px] font-mono font-black tracking-widest">
                     <div className="flex items-center gap-2">
                        <span className="text-slate-500">SYS_LOAD</span>
                        <div className="flex gap-0.5">
                           {[...Array(4)].map((_, i) => (
                             <motion.div 
                               key={i}
                               animate={{ opacity: [0.2, 1, 0.2] }}
                               transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                               className="w-1 h-1 bg-violet-500/40"
                             />
                           ))}
                        </div>
                     </div>
                     <span className="text-emerald-500 animate-pulse drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">OPTIMAL</span>
                  </div>
                  
                  <div className="h-2 bg-black/40 rounded-full border border-white/5 p-[1px] relative overflow-hidden">
                     {/* Segmented Background */}
                     <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20">
                        {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-white/20" />)}
                     </div>

                     {/* Main Progress Bar */}
                     <motion.div 
                      className="h-full bg-gradient-to-r from-violet-600 to-violet-400 relative z-10 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                      animate={{ 
                        width: ["20%", "45%", "35%", "55%", "25%", "40%"]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                     >
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/40 blur-sm"></div>
                     </motion.div>

                     {/* Secondary Ghost Bar for depth */}
                     <motion.div 
                      className="absolute top-0 left-0 h-full bg-violet-500/20 z-0"
                      animate={{ 
                        width: ["10%", "60%", "20%", "75%", "15%", "50%"]
                      }}
                      transition={{ 
                        duration: 6, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                     />
                  </div>

                  <div className="flex justify-between text-[6px] font-mono text-slate-600 font-bold">
                     <span>0%</span>
                     <span>50%</span>
                     <span>100%</span>
                  </div>
               </div>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER (Exact match to Training Page) */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10 font-mono text-[10px] uppercase tracking-[0.5em]">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest text-white/40">Encryption</span>
             <span>AES-256_ACTIVE</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest text-white/40">Uplink</span>
             <span>GLOBAL_SYNC_OK</span>
          </div>
        </div>
        <div>
          UrbanClash Social Interface v4.0.2
        </div>
      </footer>
    </div>
  );
}