import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  BoltIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  ClockIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";
import { useUserProfile } from "../hooks/useUserProfile";
import { useToast } from "../contexts/ToastContext";
import { tokenStorage } from "../lib/api";
import { recoveryService } from "../services/recoveryService";
import { socketService, ChatMessage } from "../services/socketService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * RECOVERY BASE PAGE - AAA Military Cyberpunk Aesthetic
 * Follows the standard established in TrainingPage.tsx
 */

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function RecoveryBasePage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const status = userProfile?.status || 'Operacional';
  const subtitle = "UNIDADE MÉDICA DE ELITE. RECUPERAÇÃO BIOCIBERNÉTICA EM ANDAMENTO.";

  // Contador de tempo restante
  useEffect(() => {
    if (!userProfile?.status_ends_at || status === 'Operacional') {
      setTimeLeft(null);
      return;
    }

    const endsAtMs = new Date(userProfile.status_ends_at).getTime();
    if (isNaN(endsAtMs)) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endsAtMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      // Se o tempo acabar, forçar um refresh do perfil para limpar o status
      if (remaining === 0) {
        refreshProfile();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [userProfile?.status_ends_at, status, refreshProfile]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-red-500/30">
      
      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-red-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/50"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(239,68,68,0.7), -2px 0px 0px rgba(34,211,238,0.7)" }}>
            Recovery <span className="text-red-500">Base</span> HUB
          </h1>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-red-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-red-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">MED_CORPS</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-red-400 font-bold tracking-widest">PROTOCOL_RECOVERY_V4</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-red-400/80 animate-pulse tracking-widest font-bold uppercase">● Medical_Systems_Online</span>
            </div>
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-red-500/50 w-fit backdrop-blur-sm">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* COMPACT HUD ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* STATUS & TIMER */}
          <div className="cyber-card p-4 flex items-center justify-between col-span-1 lg:col-span-2" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 flex items-center justify-center" style={MILITARY_CLIP}>
                <ShieldCheckIcon className={`w-6 h-6 ${getStatusColor(status)}`} />
              </div>
              <div>
                <h3 className="text-[9px] font-orbitron text-slate-500 tracking-[0.2em]">CURRENT_STATUS</h3>
                <p className={`text-xl font-black font-orbitron italic uppercase ${getStatusColor(status)}`}>{status}</p>
              </div>
            </div>

            {timeLeft !== null && (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-3 bg-red-500/10 px-4 py-2 border border-red-500/30" style={MILITARY_CLIP}>
                  <ClockIcon className="w-4 h-4 text-red-500" />
                  <span className="text-2xl font-orbitron font-black text-white italic tracking-tighter">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                  Sincronização Final: {userProfile.status_ends_at ? format(new Date(userProfile.status_ends_at), "HH:mm:ss") : "--:--:--"}
                </span>
              </div>
            )}
          </div>

          {/* PREMIUM ASSETS */}
          <div className="cyber-card p-4 flex items-center justify-between" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center" style={MILITARY_CLIP}>
                <BanknotesIcon className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-[9px] font-orbitron text-slate-500 tracking-[0.2em]">PREMIUM_ASSETS</h3>
                <p className="text-xl font-black font-orbitron text-white italic">{(userProfile as any).premium_coins || 0} <span className="text-[9px] text-yellow-500">UC</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT BASED ON STATUS */}
        <AnimatePresence mode="wait">
          {status === 'Sangrando' && (
            <motion.div 
              key="bleeding"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <BleedingView user={userProfile} onAction={refreshProfile} timeLeft={timeLeft} formatTime={formatTime} />
            </motion.div>
          )}

          {status === 'Recondicionamento' && (
            <motion.div 
              key="reconditioning"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <ReconditioningView user={userProfile} timeLeft={timeLeft} formatTime={formatTime} />
            </motion.div>
          )}

          {status === 'Operacional' && (
            <motion.div 
              key="operational"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <OperationalView onAction={refreshProfile} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10 font-mono">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase text-red-500">Medical_Link</span>
             <span className="text-[10px]">ENCRYPTED_BIO_DATA</span>
          </div>
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase text-red-500">Sanitizing</span>
             <span className="text-[10px]">SCAN_ACTIVE</span>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.5em]">
          UrbanClash Medical Interface v4.0.2
        </div>
      </footer>
    </div>
  );
}

// ─── Componentes de Visão ────────────────────────────────────────────────────────

function BleedingView({ user, onAction, timeLeft, formatTime }: { user: any, onAction: () => void, timeLeft: number | null, formatTime: (s: number) => string }) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const buyAntidote = async () => {
    setLoading(true);
    try {
      await recoveryService.buyAntidote();
      showToast("Antídoto aplicado! Protocolo de sangramento encerrado.", "success");
      onAction();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro ao aplicar antídoto.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-card cyber-card-red p-8 relative overflow-hidden" style={MILITARY_CLIP}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <ExclamationTriangleIcon className="w-64 h-64 text-white" />
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
        <div className="w-32 h-32 bg-red-600/20 border-2 border-red-600 flex flex-col items-center justify-center animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)]" style={MILITARY_CLIP}>
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-1" />
          {timeLeft !== null && (
            <span className="text-lg font-orbitron font-black text-white">{formatTime(timeLeft)}</span>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <h2 className="text-xl font-orbitron font-black text-white italic uppercase tracking-widest">Bio-Degradação Crítica</h2>
          </div>
          <p className="text-slate-400 font-mono text-sm max-w-xl uppercase tracking-wider leading-relaxed">
            Seu sistema biocibernético está perdendo integridade. Protocolo de emergência necessário. 
            O uso de antídoto nano-sintético é a única via de estabilização imediata.
          </p>
          
          <div className="flex flex-wrap gap-6 items-center pt-4">
            <div className="bg-black/60 px-4 py-2 border border-yellow-500/30 flex items-center gap-3" style={MILITARY_CLIP}>
               <span className="text-[10px] font-mono text-gray-500 uppercase">Custo</span>
               <span className="text-xl font-orbitron font-black text-yellow-500 italic">1 UC</span>
            </div>
            
            <button 
              disabled={loading}
              onClick={buyAntidote}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-orbitron font-black uppercase italic tracking-[0.2em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={MILITARY_CLIP}
            >
              {loading ? "PROCESSANDO..." : "ENGAGE_ANTIDOTE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReconditioningView({ user, timeLeft, formatTime }: { user: any, timeLeft: number | null, formatTime: (s: number) => string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = tokenStorage.getToken();
    if (!token || user?.status !== 'Recondicionamento') return;

    const handleHistory = (history: ChatMessage[]) => setMessages(history);
    const handleMessage = (msg: ChatMessage) => setMessages(prev => {
      // Evitar duplicatas por ID
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev.slice(-19), msg];
    });
    const handleUsers = (users: any[]) => setOnlineUsers(users);

    socketService.onRecoveryHistory(handleHistory);
    socketService.onRecoveryMessageReceived(handleMessage);
    socketService.onRecoveryUsers(handleUsers);

    // Pequeno delay para garantir que os listeners estão prontos
    const timer = setTimeout(() => {
      socketService.authenticateRecovery(token);
    }, 500);

    return () => {
      clearTimeout(timer);
      // O ideal seria dar off nos listeners, mas o Singleton socketService
      // costuma gerenciar isso. Para garantir, limpamos o estado local.
      setMessages([]);
      setOnlineUsers([]);
    };
  }, [user?.status]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socketService.sendRecoveryMessage(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[550px] cyber-card relative overflow-hidden" style={MILITARY_CLIP}>
      {/* HEADER DO CHAT */}
      <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          <h3 className="font-orbitron font-black text-white text-[11px] uppercase tracking-[0.3em] italic">Frequency_Emergency_B01</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter hidden md:inline">Status: <span className="text-emerald-500">Encrypted_Link</span></span>
          <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 border border-red-500/20" style={MILITARY_CLIP}>
            <UserGroupIcon className="w-3 h-3 text-red-500" />
            <span className="text-[10px] font-black text-red-500">{onlineUsers.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ÁREA DE MENSAGENS */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/40">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-500 mb-2" />
                <p className="text-[10px] font-mono uppercase tracking-widest">Nenhuma transmissão detectada...</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 items-start group">
                <img 
                  src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} 
                  className="w-8 h-8 bg-white/10 border border-white/20" 
                  style={MILITARY_CLIP} 
                  alt="avatar"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-red-500 uppercase italic tracking-tighter">{msg.username}</span>
                    <span className="text-[8px] font-mono text-slate-600">[{format(new Date(msg.timestamp), "HH:mm")}]</span>
                  </div>
                  <div className="bg-white/5 p-3 text-xs text-slate-300 border-l-2 border-red-500/30 break-words" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 4px 100%, 0 calc(100% - 4px))" }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* INPUT FIXO */}
          <form onSubmit={sendMessage} className="p-4 bg-black/80 border-t border-white/10 flex gap-2">
            <input 
              type="text"
              maxLength={100}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua transmissão (máx 100 caracteres)..."
              className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
            />
            <button 
              type="submit" 
              className="px-6 bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]" 
              style={MILITARY_CLIP}
            >
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </button>
          </form>
        </div>

        {/* SIDEBAR DE USUÁRIOS (Compacto) */}
        <div className="w-48 bg-black/60 border-l border-white/10 hidden md:flex flex-col">
          <div className="p-3 bg-white/5 border-b border-white/10">
            <span className="text-[9px] font-black font-orbitron text-slate-500 uppercase tracking-widest">Contatos_Online</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 hover:border-red-500/30 transition-colors group" style={MILITARY_CLIP}>
                <div className="relative">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase italic truncate group-hover:text-white transition-colors">{u.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationalView({ onAction }: { onAction: () => void }) {
  const [allies, setAllies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescuingId, setRescuingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadAllies();
  }, []);

  const loadAllies = async () => {
    try {
      const data = await recoveryService.getAllies();
      setAllies(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const rescueAlly = async (allyId: string) => {
    setRescuingId(allyId);
    try {
      await recoveryService.rescueAlly(allyId);
      showToast("Aliado resgatado com sucesso!", "success");
      setAllies(prev => prev.filter(a => a.id !== allyId));
      onAction();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro no resgate.", "error");
    } finally { setRescuingId(null); }
  };

  return (
    <div className="space-y-8">
      <div className="cyber-card p-6" style={MILITARY_CLIP}>
         <h3 className="text-[10px] font-orbitron text-cyan-500 mb-6 flex items-center gap-2 tracking-[0.3em]">
            <div className="w-2 h-2 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)]"></div> RESCUE_PROTOCOL
          </h3>
          <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed border-l-2 border-cyan-500/50 pl-4">
            Aliados em recondicionamento podem ser reativados via transferência de créditos. 
            Custo operacional: <span className="text-yellow-500 font-bold">5 U-CRYPTON TOKENS</span> por unidade.
          </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse" style={MILITARY_CLIP} />)
        ) : allies.length === 0 ? (
          <div className="col-span-full py-20 text-center relative overflow-hidden bg-black/40 border border-white/5" style={MILITARY_CLIP}>
            {/* Background Radar Effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <div className="w-64 h-64 border-2 border-cyan-500 rounded-full animate-ping" />
              <div className="absolute w-48 h-48 border border-cyan-500/50 rounded-full animate-ping [animation-delay:0.5s]" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-red-500/30" />
                ))}
              </div>
              <div>
                <p className="text-red-500 font-orbitron text-[11px] uppercase tracking-[0.5em] font-black italic drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                  Radar Med_Scan: <span className="text-white animate-pulse">Zero_Signals</span>
                </p>
                <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em] mt-3 font-bold">
                  Nenhuma unidade em recondicionamento detectada no setor.
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
                <div className="h-1 w-1 bg-white/20 rounded-full" />
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
              </div>
            </div>
          </div>
        ) : (
          allies.map((ally) => (
            <motion.div 
              key={ally.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card p-4 flex items-center justify-between group hover:bg-white/5 transition-colors"
              style={MILITARY_CLIP}
            >
              <div className="flex items-center gap-4">
                <img src={ally.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ally.username}`} className="w-12 h-12 bg-white/10" style={MILITARY_CLIP} />
                <div>
                  <p className="text-sm font-black text-white italic uppercase tracking-tighter">{ally.username}</p>
                  <p className="text-[8px] font-mono text-cyan-500 uppercase tracking-widest">Nível {ally.level} • RECO_MODE</p>
                </div>
              </div>
              
              <button 
                onClick={() => rescueAlly(ally.id)}
                disabled={rescuingId !== null}
                className="px-4 py-2 bg-yellow-600/10 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-600/30 font-orbitron font-black text-[9px] uppercase italic transition-all"
                style={MILITARY_CLIP}
              >
                {rescuingId === ally.id ? "..." : "RESGATAR"}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Sangrando': return 'text-red-500';
    case 'Recondicionamento': return 'text-blue-500';
    case 'Operacional': return 'text-green-500';
    default: return 'text-gray-400';
  }
}