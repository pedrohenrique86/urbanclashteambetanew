import React, { useState, useEffect, useRef } from "react";
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
import { tokenStorage } from "../lib/api";
import { socketService, ChatMessage } from "../services/socketService";
import { format } from "date-fns";
import { getFactionColor } from "./RecoveryBasePage";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function SocialZonePage() {
  const { userProfile } = useUserProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const subtitle = "FREQUÊNCIA GLOBAL UNIFICADA. TRANSMISSÃO CRIPTOGRAFADA EM TEMPO REAL.";

  useEffect(() => {
    const token = tokenStorage.getToken();
    if (!token) return;

    socketService.onGlobalHistory((history) => setMessages(history));
    socketService.onGlobalMessageReceived((msg) => setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev.slice(-29), msg];
    }));
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

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socketService.sendGlobalMessage(inputText);
    setInputText("");
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
                    <img 
                      src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} 
                      className="w-10 h-10 bg-white/5 border border-white/10 group-hover:border-violet-500/50 transition-colors" 
                      style={MILITARY_CLIP}
                      alt="avatar"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-black uppercase italic tracking-tight ${getFactionColor(msg.faction)}`}>
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
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* INPUT FORM */}
            <form onSubmit={sendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  maxLength={120}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digitar transmissão global..."
                  className="w-full bg-white/5 border border-white/10 px-5 py-3 text-xs font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              <button 
                type="submit"
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-orbitron font-black uppercase italic tracking-widest transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
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
                  className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all group"
                  style={MILITARY_CLIP}
                >
                  <div className="relative">
                    <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-7 h-7 bg-black/40" style={MILITARY_CLIP} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-black animate-pulse"></div>
                  </div>
                  <span className={`text-[10px] font-black uppercase italic truncate group-hover:text-white transition-colors ${getFactionColor(u.faction)}`}>
                    {u.username}
                  </span>
                </div>
              ))}
            </div>

            {/* SYSTEM LOAD DECORATION */}
            <div className="p-4 bg-white/5 border-t border-white/10 mt-auto">
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                     <span>SYS_LOAD</span>
                     <span className="text-emerald-500 animate-pulse">OPTIMAL</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
                     <motion.div 
                      className="h-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                      animate={{ 
                        width: ["15%", "45%", "25%", "60%", "30%"],
                        x: ["0%", "10%", "0%", "5%", "0%"]
                      }}
                      transition={{ 
                        duration: 8, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                     />
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