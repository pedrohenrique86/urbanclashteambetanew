import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LockClosedIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  PaperAirplaneIcon,
  ClockIcon,
  BanknotesIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { useUserProfile } from "../hooks/useUserProfile";
import { useToast } from "../contexts/ToastContext";
import { tokenStorage } from "../lib/api";
import { isolationService } from "../services/isolationService";
import { socketService, ChatMessage } from "../services/socketService";
import { format } from "date-fns";
import { getFactionColor } from "./RecoveryBasePage";

/**
 * ISOLATION PAGE - High Security Containment Unit
 * Visual style: Military Cyberpunk, Predominant Black.
 */

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function IsolationPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const status = userProfile?.status || 'Operacional';
  const subtitle = "SETOR DE ISOLAMENTO DE ALTA SEGURANÇA. CONTENÇÃO MÁXIMA ATIVA.";

  // Contador de tempo restante (se aplicável ao isolamento)
  useEffect(() => {
    if (!userProfile?.status_ends_at || status !== 'Isolamento') {
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
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-yellow-500/30">

      {/* HUD DECORATION - CORNERS */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-white/5 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white/20"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white/20"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white/20"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white/20"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase" style={{ textShadow: "2px 0px 0px rgba(255,255,255,0.2), -2px 0px 0px rgba(255,255,255,0.1)" }}>
            Isolation <span className="text-white/40">Sector</span>
          </h1>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-white/10 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-white/10 px-2 py-0.5">
                  <span className="text-[9px] font-black text-white uppercase">CORRECTION_DEPT</span>
                </div>
                <div className="px-3 py-0.5">
                  <span className="text-[10px] font-mono text-white/40 font-bold tracking-widest">PROTOCOL_CONTAINMENT_V2</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-white/60 animate-pulse tracking-widest font-bold uppercase">● Security_Grid_Active</span>
            </div>
            <p className="text-slate-400 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-white/20 w-fit backdrop-blur-sm">
              {subtitle}
            </p>
          </div>
        </motion.div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* TOP STATUS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* USER STATUS CARD */}
          <div className="cyber-card bg-black/60 p-6 relative group border-white/5" style={MILITARY_CLIP}>
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-25 transition-opacity">
              <ShieldExclamationIcon className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-[10px] font-orbitron text-white/40 mb-6 flex items-center gap-2 tracking-[0.3em]">
              <div className="w-2 h-2 bg-white/20"></div> CURRENT_STATUS
            </h3>
            <div className="flex items-end justify-between mb-2">
              <span className={`text-4xl font-black font-orbitron leading-none uppercase italic ${status === 'Isolamento' ? 'text-white' : 'text-green-500'}`}>
                {status}
              </span>

              {timeLeft !== null && (
                <div className="bg-black/60 px-4 py-2 border border-red-500/20 flex flex-col items-end relative overflow-hidden" style={MILITARY_CLIP}>
                  <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                  <span className="text-[8px] font-mono text-red-500/60 uppercase tracking-widest relative z-10">Tempo de Contenção</span>
                  <span className="text-2xl font-orbitron font-black text-red-500 italic relative z-10" style={{ textShadow: "0 0 10px rgba(239, 68, 68, 0.5)" }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ASSETS CARD */}
          <div className="cyber-card bg-black/60 p-6 relative group border-white/5" style={MILITARY_CLIP}>
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-25 transition-opacity">
              <BanknotesIcon className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-[10px] font-orbitron text-white/40 mb-6 flex items-center gap-2 tracking-[0.3em]">
              <div className="w-2 h-2 bg-white/20"></div> ASSET_INVENTORY
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-amber-400 font-orbitron leading-none" style={{ textShadow: "0 0 10px #f59e0b" }}>
                  {(userProfile as any).premium_coins || 0}
                </span>
                <span className="text-amber-400 font-black uppercase text-[10px] tracking-widest mb-1 italic">U-CRYPTON</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-black text-lime-400 font-orbitron leading-none" style={{ textShadow: "0 0 10px #84cc16" }}>
                  $ {(userProfile as any).money?.toLocaleString() || 0}
                </span>
                <span className="text-lime-400 font-black uppercase text-[8px] tracking-widest mb-1 italic">CASH</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT BASED ON STATUS */}
        <AnimatePresence mode="wait">
          {status === 'Isolamento' && (
            <motion.div
              key="isolation"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              <IsolationActionsView user={userProfile} onAction={refreshProfile} />
              <IsolationChatView user={userProfile} />
            </motion.div>
          )}

          {status === 'Operacional' && (
            <motion.div
              key="operational"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <OperationalIsolationView onAction={refreshProfile} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all relative z-10 font-mono">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] font-black tracking-widest uppercase text-white/40">Security_Link</span>
            <span className="text-[10px]">ENCRYPTED_GRID_DATA</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black tracking-widest uppercase text-white/40">Surveillance</span>
            <span className="text-[10px]">MONITORING_ACTIVE</span>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.5em]">
          UrbanClash Containment Interface v2.1.0
        </div>
      </footer>
    </div>
  );
}

// ─── Componentes de Visão ────────────────────────────────────────────────────────

function IsolationActionsView({ user, onAction }: { user: any, onAction: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  const level = user.level || 1;
  const bribeCost = level * 500;

  const handleBribe = async () => {
    setLoading("bribe");
    try {
      await isolationService.bribe();
      showToast("Suborno aceito. Você foi liberado.", "success");
      onAction();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro no suborno.", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleInstantEscape = async () => {
    setLoading("instant");
    try {
      await isolationService.instantEscape();
      showToast("Liberação imediata confirmada.", "success");
      onAction();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro na transação.", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* BRIBE OPTION */}
      <div className="cyber-card bg-black/60 p-8 border-white/5 relative overflow-hidden" style={MILITARY_CLIP}>
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <CurrencyDollarIcon className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <h3 className="text-xl font-orbitron font-black text-white italic uppercase tracking-widest">Subornar Governante</h3>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-wider leading-relaxed">
            Sempre há um preço para a liberdade. O governante local aceita créditos em troca da sua ficha limpa.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="bg-black/60 px-4 py-2 border border-white/10 flex items-center gap-3" style={MILITARY_CLIP}>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Custo</span>
              <span className="text-xl font-orbitron font-black text-lime-400 italic" style={{ textShadow: "0 0 10px #84cc16" }}>$ {bribeCost.toLocaleString()}</span>
            </div>
            <button
              disabled={!!loading}
              onClick={handleBribe}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-orbitron font-black uppercase italic tracking-[0.2em] transition-all disabled:opacity-50"
              style={MILITARY_CLIP}
            >
              {loading === "bribe" ? "PROCESSANDO..." : "SUBORNAR"}
            </button>
          </div>
        </div>
      </div>

      {/* INSTANT ESCAPE OPTION */}
      <div className="cyber-card bg-black/60 p-8 border-white/5 relative overflow-hidden" style={MILITARY_CLIP}>
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <BoltIcon className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <h3 className="text-xl font-orbitron font-black text-white italic uppercase tracking-widest">Liberação Imediata</h3>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-wider leading-relaxed">
            Utilize sua influência no mercado paralelo para forçar uma liberação imediata via tokens criptografados.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="bg-black/60 px-4 py-2 border border-yellow-500/20 flex items-center gap-3" style={MILITARY_CLIP}>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Custo</span>
              <span className="text-xl font-orbitron font-black text-amber-400 italic" style={{ textShadow: "0 0 10px #f59e0b" }}>5 UC</span>
            </div>
            <button
              disabled={!!loading}
              onClick={handleInstantEscape}
              className="flex-1 px-6 py-3 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-600/30 font-orbitron font-black uppercase italic tracking-[0.2em] transition-all disabled:opacity-50"
              style={MILITARY_CLIP}
            >
              {loading === "instant" ? "PROCESSANDO..." : "ESCAPAR AGORA"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IsolationChatView({ user }: { user: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = tokenStorage.getToken();
    if (!token) return;

    socketService.onIsolationHistory((history) => setMessages(history));
    socketService.onIsolationMessageReceived((msg) => setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev.slice(-19), msg];
    }));
    socketService.onIsolationUsers((users) => setOnlineUsers(users));

    const timer = setTimeout(() => {
      socketService.authenticateIsolation(token);
    }, 500);

    return () => {
      clearTimeout(timer);
      setMessages([]);
      setOnlineUsers([]);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socketService.sendIsolationMessage(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[500px] cyber-card bg-black/60 border-white/5 relative overflow-hidden" style={MILITARY_CLIP}>
      {/* HEADER DO CHAT */}
      <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/40 animate-pulse"></div>
          <h3 className="font-orbitron font-black text-white text-[10px] uppercase tracking-widest italic">Containment_Frequency_X</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 border border-white/10">
            <UserGroupIcon className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-black text-white/60">{onlineUsers.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ÁREA DE MENSAGENS */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-20">
                <p className="text-[10px] font-mono text-white uppercase tracking-[0.5em]">Sem transmissões...</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 items-start group">
                <img src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} className="w-8 h-8 bg-white/5 border border-white/10" style={MILITARY_CLIP} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase italic tracking-tighter ${getFactionColor((msg as any).faction)}`}>{msg.username}</span>
                    <span className="text-[8px] font-mono text-slate-600">[{format(new Date(msg.timestamp), "HH:mm")}]</span>
                  </div>
                  <div className="bg-white/5 p-3 text-xs text-slate-300 border-l border-white/20 break-words" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 4px 100%, 0 calc(100% - 4px))" }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* INPUT FIXO */}
          <form onSubmit={sendMessage} className="p-4 bg-black border-t border-white/5 flex gap-2">
            <input
              type="text"
              maxLength={100}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Sussurrar transmissão (máx 100 carac)..."
              className="flex-1 bg-white/5 border border-white/10 px-4 py-2 text-xs font-mono focus:outline-none focus:border-white/30 text-white placeholder:text-white/20"
            />
            <button type="submit" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white transition-colors" style={MILITARY_CLIP}>
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </button>
          </form>
        </div>

        {/* SIDEBAR DE USUÁRIOS */}
        <div className="w-40 bg-black/40 border-l border-white/5 hidden md:flex flex-col">
          <div className="p-2 bg-white/5 border-b border-white/5">
            <span className="text-[8px] font-black font-orbitron text-white/20 uppercase tracking-widest">Detidos</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {onlineUsers.map(u => (
              <div key={u.id} className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/5 group" style={MILITARY_CLIP}>
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <span className={`text-[9px] font-black uppercase italic truncate group-hover:text-white transition-colors ${getFactionColor(u.faction)}`}>{u.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationalIsolationView({ onAction }: { onAction: () => void }) {
  const [allies, setAllies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescuingId, setRescuingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadAllies();
  }, []);

  const loadAllies = async () => {
    try {
      const data = await isolationService.getAllies();
      setAllies(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const rescueAlly = async (allyId: string) => {
    setRescuingId(allyId);
    try {
      await isolationService.helpAlly(allyId);
      showToast("Aliado liberado com sucesso!", "success");
      setAllies(prev => prev.filter(a => a.id !== allyId));
      onAction();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erro na liberação.", "error");
    } finally { setRescuingId(null); }
  };

  return (
    <div className="space-y-8">
      <div className="cyber-card bg-black/60 p-6 border-white/5" style={MILITARY_CLIP}>
        <h3 className="text-[10px] font-orbitron text-white/40 mb-6 flex items-center gap-2 tracking-[0.3em]">
          <div className="w-2 h-2 bg-white/20"></div> RELEASE_PROTOCOL
        </h3>
        <p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest leading-relaxed border-l-2 border-white/20 pl-4">
          Aliados em isolamento podem ser liberados via transferência de tokens criptografados para as autoridades.
          Custo operacional: <span className="text-amber-400 font-black" style={{ textShadow: "0 0 8px #f59e0b" }}>10 U-CRYPTON TOKENS</span> por unidade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/5 animate-pulse" style={MILITARY_CLIP} />)
        ) : allies.length === 0 ? (
          <div className="col-span-full py-20 text-center relative overflow-hidden bg-black/40 border border-white/5" style={MILITARY_CLIP}>
            <div className="relative z-10 space-y-4">
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-white/10" />
                ))}
              </div>
              <div>
                <p className="text-white/40 font-orbitron text-[11px] uppercase tracking-[0.5em] font-black italic">
                  Detention_Scan: <span className="text-white animate-pulse">Zero_Signals</span>
                </p>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] mt-3 font-bold">
                  Nenhuma unidade da facção em isolamento detectada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          allies.map((ally) => (
            <motion.div
              key={ally.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card bg-black/60 p-4 flex items-center justify-between group hover:bg-white/5 transition-colors border-white/5"
              style={MILITARY_CLIP}
            >
              <div className="flex items-center gap-4">
                <img src={ally.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ally.username}`} className="w-12 h-12 bg-white/5 border border-white/10" style={MILITARY_CLIP} />
                <div>
                  <p className="text-sm font-black text-white italic uppercase tracking-tighter">{ally.username}</p>
                  <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Nível {ally.level} • DETAINED</p>
                </div>
              </div>

              <button
                onClick={() => rescueAlly(ally.id)}
                disabled={rescuingId !== null}
                className="px-4 py-2 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-600/30 font-orbitron font-black text-[9px] uppercase italic transition-all"
                style={MILITARY_CLIP}
              >
                {rescuingId === ally.id ? "..." : "LIBERAR"}
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}