import React, { useState, useEffect } from "react";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useToast } from "../contexts/ToastContext";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import useSWR from "swr";
import api from "../lib/api";
import { socketService } from "../services/socketService";
import { supplyService } from "../services/supplyService";
import { UtensilsIcon, CoffeeIcon, PizzaIcon } from "lucide-react";
import { 
  ShieldCheckIcon, 
  BoltIcon, 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  FireIcon,
  LockClosedIcon,
  SparklesIcon,
  BriefcaseIcon,
  ScaleIcon,
  BanknotesIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types ---
const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

interface Heist {
  id: string;
  name: string;
  level: number;
  costPA: number;
  costEnergy: number;
  xp: [number, number];
  money: [number, number];
  attrChance: number;
  lootChance: number;
}

interface GuardianTask {
  id: string;
  name: string;
  level: number;
  costPA: number;
  costEnergy: number;
  salary: [number, number];
  merit: [number, number];
  xp: [number, number];
  interceptChance: number;
}

interface ContractConfig {
  heists: Heist[];
  dailySpecial: Heist;
  guardianTasks: GuardianTask[];
}

interface ContractLog {
  id: string;
  username: string;
  faction: string;
  event_type: string;
  message: string;
  territory_name: string;
  created_at: string;
}

interface ContractStatus {
  logs: ContractLog[];
}

// --- Components ---

const ContractManualModal = ({ isOpen, onClose, faction }: { isOpen: boolean, onClose: () => void, faction: string }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="bg-zinc-950/95 border-2 border-orange-500/50 p-4 sm:p-8 max-w-4xl w-full relative shadow-[0_0_100px_rgba(249,115,22,0.2)] cursor-default overflow-y-auto max-h-[90vh] custom-scrollbar"
            style={MILITARY_CLIP}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-orange-400 transition-colors group"
            >
              <XMarkIcon className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <div className="mb-10">
              <h3 className="text-3xl font-orbitron font-black text-white uppercase tracking-[0.4em] flex items-center gap-4">
                <div className="p-2 bg-orange-500/10 border border-orange-500/30">
                  <BriefcaseIcon className="w-8 h-8 text-orange-400" />
                </div>
                GUIA DE CONTRATOS
              </h3>
              <div className="h-px w-full bg-gradient-to-r from-orange-500/50 via-orange-500/10 to-transparent mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h4 className="text-orange-400 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400" />
                    Dinâmica de Facções
                  </h4>
                  <ul className="space-y-6 text-[11px] font-mono text-slate-400 uppercase leading-relaxed">
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-orange-500/30">
                      <span className="text-orange-500 font-black">01</span>
                      <span><strong className="text-white text-sm">Foco Operacional:</strong> O sistema suspende automaticamente tarefas obsoletas, mantendo visíveis apenas os <strong className="text-orange-400">2 contratos mais relevantes</strong> para seu nível.</span>
                    </li>
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-blue-500/30">
                      <span className="text-blue-500 font-black">02</span>
                      <span><strong className="text-white text-sm">Contrato de Elite:</strong> Ao atingir o nível do último contrato disponível, todas as tarefas anteriores são suspensas, focando 100% na <strong className="text-blue-400">Operação Final</strong>.</span>
                    </li>
                    <li className="flex items-start gap-4 p-3 bg-white/5 border-l-2 border-yellow-500/30">
                      <span className="text-yellow-500 font-black">03</span>
                      <span><strong className="text-white text-sm">Sincronia:</strong> O equilíbrio simbiótico garante que cada facção dependa e influencie o mercado da outra através de tarefas correlacionadas.</span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-emerald-400 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400" />
                    Economia e Prestígio
                  </h4>
                  <div className="bg-black/60 p-6 border border-emerald-500/20 font-mono text-[11px] text-slate-400 leading-relaxed uppercase relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <BanknotesIcon className="w-20 h-20 text-emerald-500" />
                    </div>
                    <p className="text-white font-black mb-4 italic border-b border-white/10 pb-2">Cálculo de Nível:</p>
                    <div className="space-y-2 text-emerald-300 text-xs mb-6 bg-emerald-500/5 p-4 border border-emerald-500/10">
                      <p>Soma de XP + Atributos + Capital</p>
                    </div>
                    <ul className="space-y-2 text-[10px]">
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Experiência (XP)</span>
                        <span className="text-white">Curva Progressiva</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Stats (Treino)</span>
                        <span className="text-white">25 pts = +1 Nível</span>
                      </li>
                      <li className="flex justify-between border-b border-white/5 pb-1">
                        <span>Capital (Cash)</span>
                        <span className="text-emerald-400 font-bold">$100k = +1 Nível</span>
                      </li>
                    </ul>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-cyan-400 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400" />
                    Confronto e Localidade
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/5 p-4 border border-cyan-500/20 group hover:border-cyan-500/40 transition-colors">
                      <div className="text-cyan-500 font-black mb-2 flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4" /> EMBOSCADA
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
                        Ocorre quando tarefas de Guardião e Renegado são correlacionadas. Chance Dinâmica: <strong className="text-white">10% a 30%</strong> (Escalável por Nível).
                      </p>
                    </div>
                    <div className="bg-white/5 p-4 border border-amber-500/20 group hover:border-amber-500/40 transition-colors">
                      <div className="text-amber-500 font-black mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" /> RESOLUÇÃO
                      </div>
                      <div className="text-[9px] text-slate-400 leading-relaxed uppercase space-y-1">
                        <p><span className="text-blue-400 font-bold">Guardião:</span> (DEF*0.5) + (FOC*0.3) + (INS*0.2)</p>
                        <p><span className="text-orange-400 font-bold">Renegado:</span> (ATK*0.5) + (INS*0.3) + (FOC*0.2)</p>
                        <p className="text-[8px] italic opacity-60">±10% variação aleatória de momento</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-red-500 font-orbitron font-black text-sm mb-6 tracking-widest uppercase italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500" />
                    Protocolos Especiais
                  </h4>
                  <div className="bg-red-950/20 border border-red-500/20 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                      <FireIcon className="w-12 h-12 text-red-500" />
                    </div>
                    <p className="text-[10px] text-red-400 font-black mb-2 tracking-widest">● GOLPE DE MESTRE</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase leading-relaxed">
                      Evento Crítico. Chance de detecção elevada para <strong className="text-red-500">50%</strong>. O sinal forte permanece ativo por 10 minutos para todos os Guardiões.
                    </p>
                  </div>
                  
                  <div className="mt-4 p-4 bg-orange-950/20 border border-orange-500/20">
                    <p className="text-[10px] text-orange-400 font-black mb-2 tracking-widest">● MERCADO NEGRO</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase leading-relaxed">
                      Itens confiscados por Guardiões podem ser vendidos ilegalmente, aumentando a Corrupção mas gerando lucro imediato.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-12 p-6 bg-orange-950/20 border border-orange-500/30 relative overflow-hidden group">
               <div className="absolute inset-y-0 left-0 w-1 bg-orange-500 group-hover:h-full transition-all duration-500 h-1/2 top-1/4" />
               <p className="text-xs font-mono text-orange-400/80 leading-relaxed uppercase text-center italic tracking-widest">
                  &quot;No UrbanClash, o crime não apenas compensa, ele sustenta toda a infraestrutura da cidade.&quot;
               </p>
            </div>

            <button 
              onClick={onClose}
              className="mt-10 w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black font-orbitron uppercase tracking-[0.5em] transition-all text-sm shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
              style={MILITARY_CLIP}
            >
              FECHAR MANUAL DE OPERAÇÕES
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ActionCard = ({ data, onAction, disabled, userLevel, userEnergy, userPA, userTox, userMoney, type, cooldown, onSupply }: any) => {
  const [showFastFood, setShowFastFood] = useState(false);
  const isLocked = userLevel < data.level;
  const hasResources = (userEnergy >= (data.costEnergy || 0)) && (userPA >= (data.costPA || 0));
  const isRenegade = type === 'heist';

  const REFILL_BASE_CASH = 1600;
  const REFILL_PA = 600;

  const calculateFullRefillCost = () => {
    const toxicityMultiplier = 1 + (userTox / 250);
    return Math.floor(REFILL_BASE_CASH * toxicityMultiplier);
  };

  const refillCost = calculateFullRefillCost();
  const canAffordRefill = userMoney >= refillCost && userPA >= REFILL_PA;

  return (
    <motion.div 
      whileHover={!isLocked && !disabled ? { scale: 1.01, y: -1 } : {}}
      className={`relative p-4 border rounded-sm transition-all overflow-hidden flex flex-col gap-3 ${
        isLocked 
          ? "bg-zinc-900/20 border-zinc-800/50 grayscale opacity-40" 
          : (!hasResources ? "bg-zinc-900/40 border-red-900/50 opacity-80" : "bg-zinc-900/40 border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/60")
      }`}
    >
      <div className="flex justify-between items-start cursor-pointer" onClick={() => !isLocked && !disabled && hasResources && onAction(data.id)}>
        <div className="flex flex-col">
          <h4 className={`text-sm font-black uppercase tracking-tighter ${isLocked ? "text-zinc-500" : "text-white"}`}>
            {data.name}
          </h4>
          <span className="text-[9px] font-bold text-zinc-500 uppercase">Nível {data.level}</span>
        </div>
        {isLocked ? (
          <LockClosedIcon className="w-4 h-4 text-zinc-600" />
        ) : (
          <div className="flex items-center gap-2">
            {cooldown > 0 && (
              <span className="text-[10px] font-black text-red-500 animate-pulse">{cooldown}S</span>
            )}
            <div className={`w-2 h-2 rounded-full animate-pulse ${isRenegade ? 'bg-orange-500' : 'bg-blue-500'}`} />
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 cursor-pointer" onClick={() => !isLocked && !disabled && hasResources && onAction(data.id)}>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${userPA < data.costPA ? 'text-red-500' : 'text-cyan-400'}`}>
          <BoltIcon className="w-3 h-3" />
          {data.costPA} PA
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${userEnergy < data.costEnergy ? 'text-red-500' : 'text-yellow-500'}`}>
          <BoltIcon className="w-3 h-3" />
          {data.costEnergy} NRG
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
          <CurrencyDollarIcon className="w-3 h-3" />
          EST. ${isRenegade ? data.money[0].toLocaleString() : data.salary[0].toLocaleString()}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-violet-400 uppercase">
          <SparklesIcon className="w-3 h-3" />
          EST. +{data.xp[0].toLocaleString()} XP
        </div>
      </div>

      {/* RECARGA RÁPIDA */}
      {!isLocked && (
        <div className="mt-2 pt-2 border-t border-zinc-800/50">
           <button 
             disabled={!canAffordRefill || userEnergy >= 100}
             onClick={(e) => { e.stopPropagation(); onSupply('full_refill'); }}
             className={`w-full p-2 flex items-center justify-between text-[9px] font-black border transition-all ${
               canAffordRefill && userEnergy < 100
                 ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white"
                 : "bg-zinc-900/50 border-zinc-800 text-zinc-600 grayscale cursor-not-allowed"
             }`}
           >
             <div className="flex items-center gap-2">
                <UtensilsIcon className="w-3 h-3" />
                <span>RECARGA TOTAL (100% EN)</span>
             </div>
             <div className="flex gap-3">
                <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-3 h-3" /> ${refillCost}</span>
                <span className="flex items-center gap-1"><BoltIcon className="w-3 h-3" /> {REFILL_PA} PA</span>
             </div>
           </button>
        </div>
      )}

      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] -rotate-12">Bloqueado</span>
        </div>
      ) : (
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1 p-2 pointer-events-none">
          {userEnergy < (data.costEnergy || 0) && (
            <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 shadow-lg border border-red-400/50 animate-pulse">SEM ENERGIA</span>
          )}
          {userPA < (data.costPA || 0) && (
            <span className="bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 shadow-lg border border-orange-400/50">SEM PA</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default function ContractsPage() {
  const { showToast } = useToast();
  const { userProfile, refreshProfile } = useUserProfileContext();
  const { data: config, mutate: mutateConfig } = useSWR<ContractConfig>("/contracts/config", (url: string) => api.get(url).then(r => r.data));
  const { data: status, mutate } = useSWR<ContractStatus>("/contracts/status", (url: string) => api.get(url).then(r => r.data));
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<ContractLog[]>([]);
  const [showInterception, setShowInterception] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState<string | null>(null);

  // Atualiza config (Ganhos dinâmicos) quando sobe de nível
  useEffect(() => {
    mutateConfig();
  }, [userProfile?.level, mutateConfig]);

  // Countdown para Golpe de Mestre (24h)
  useEffect(() => {
    if (!userProfile?.last_daily_special_at) {
      setDailyCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const lastDaily = new Date(userProfile.last_daily_special_at!).getTime();
      const now = Date.now();
      const diff = now - lastDaily;
      const hours24 = 24 * 60 * 60 * 1000;

      if (diff < hours24) {
        const remaining = hours24 - diff;
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((remaining % (1000 * 60)) / 1000);
        setDailyCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setDailyCountdown(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userProfile?.last_daily_special_at]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
  const faction = (FACTION_ALIAS_MAP_FRONTEND[factionName.toLowerCase().trim()] || 'gangsters') as 'gangsters' | 'guardas';

  useEffect(() => {
    if (status?.logs) setLocalLogs(status.logs);
  }, [status]);

  // Lógica de Filtragem de Tarefas (Página 1 e Página 2)
  const allTasks = faction === 'gangsters' ? (config?.heists || []) : (config?.guardianTasks || []);
  const userLvl = userProfile?.level || 1;
  const unlockedTasks = allTasks.filter(t => t.level <= userLvl);
  const nextLockedTask = allTasks.find(t => t.level > userLvl);
  
  // Página 1: Ativos (2 mais recentes desbloqueados + próximo bloqueado)
  let activeTasks: any[] = [];
  if (allTasks.length > 0) {
    if (!nextLockedTask) {
      // Se desbloqueou tudo, mostra apenas a última (Elite)
      activeTasks = allTasks.slice(-1);
    } else {
      // 2 últimos desbloqueados + o próximo que está trancado
      activeTasks = [...unlockedTasks.slice(-2), nextLockedTask];
    }
  }
  
  // Página 2: Histórico (Todos os outros desbloqueados que não estão nos ativos)
  const historyTasks = unlockedTasks.filter(t => !activeTasks.some(a => a.id === t.id));

  useEffect(() => {
    socketService.on("contract:log", (newLog: ContractLog) => {
      setLocalLogs(prev => [newLog, ...prev.slice(0, 19)]);
    });

    socketService.on("notification", (notif: any) => {
      if (notif.type === 'intercepted') {
        showToast(notif.message, "error");
        refreshProfile();
      }
    });

    return () => {
      socketService.off("contract:log");
      socketService.off("notification");
    };
  }, [showToast, refreshProfile]);

  const handleHeist = async (heistId: string) => {
    if (cooldown > 0) return;
    setLoadingAction(heistId);
    setCooldown(3);
    try {
      const res = await api.post("/contracts/heist", { heistId });
      let msg = res.data.message;
      if (res.data.attrGained && res.data.attrGained.length > 0) {
        const attrMsg = res.data.attrGained.map((a: any) => `+${a.gain} ${a.attr.toUpperCase()}`).join(', ');
        msg += ` [Evolução: ${attrMsg}]`;
      }
      showToast(msg, "success");
      await mutate();
      await refreshProfile();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro na operação", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGuardianTask = async (taskId: string) => {
    if (cooldown > 0) return;
    setLoadingAction(taskId);
    setCooldown(3);
    try {
      const res = await api.post("/contracts/guardian-task", { taskId });
      let msg = res.data.message;
      if (res.data.attrGained && res.data.attrGained.length > 0) {
        const attrMsg = res.data.attrGained.map((a: any) => `+${a.gain} ${a.attr.toUpperCase()}`).join(', ');
        msg += ` [Evolução: ${attrMsg}]`;
      }
      showToast(msg, "success");
      if (res.data.interception) {
        setShowInterception(true);
      }
      await mutate();
      await refreshProfile();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro na tarefa", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResolveInterception = async (action: 'sell' | 'report') => {
    setLoadingAction('resolve');
    try {
      const res = await api.post("/contracts/resolve-interception", { action });
      showToast(res.data.message, action === 'sell' ? "warning" : "success");
      setShowInterception(false);
      await refreshProfile();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro ao resolver", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickSupply = async (itemId: string) => {
    try {
      const res = await supplyService.buySupply(itemId, true); // true = isFieldBuy
      showToast(`${res.message} [ +${res.gainedEnergy}% EN ]`, "success");
      await refreshProfile();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    }
  };

  const pendingInterception = userProfile?.pending_interception;

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Capital", val: `$${userProfile?.money?.toLocaleString()}`, color: "text-emerald-400", icon: BanknotesIcon },
          { label: "Foco (PA)", val: userProfile?.action_points?.toLocaleString(), color: "text-cyan-400", icon: BoltIcon },
          { label: faction === 'gangsters' ? "Infâmia" : "Mérito", val: faction === 'gangsters' ? userProfile?.corruption : userProfile?.merit, color: faction === 'gangsters' ? "text-orange-500" : "text-blue-500", icon: faction === 'gangsters' ? FireIcon : ShieldCheckIcon },
          { label: "Energia", val: `${userProfile?.energy}%`, color: "text-yellow-500", icon: BoltIcon }
        ].map((stat, i) => (
          <div key={i} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm">
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-lg font-black font-orbitron ${stat.color}`}>{stat.val}</span>
              <stat.icon className={`w-4 h-4 ${stat.color} opacity-40`} />
            </div>
          </div>
        ))}

        {/* Manual Trigger */}
        <button 
          onClick={() => setIsManualOpen(true)}
          className="col-span-2 md:col-span-4 p-3 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500 transition-all flex items-center justify-between group"
          style={MILITARY_CLIP}
        >
          <div className="flex items-center gap-3">
            <QuestionMarkCircleIcon className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Manual de Operações & Dinâmicas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-orange-500/60 uppercase animate-pulse">Sistemas_Ativos</span>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          </div>
        </button>
      </div>

      <ContractManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} faction={faction} />

      {!config && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Sincronizando com a Central de Operações...</p>
        </div>
      )}

      {config && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-12 space-y-6">
          
          {/* Daily Special */}
          {faction === 'gangsters' && config?.dailySpecial && (
             <div className="relative group overflow-hidden p-6 border border-orange-500/30 bg-orange-500/5 rounded-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <SparklesIcon className="w-32 h-32 text-orange-500" />
                </div>
                {/* Badges do Daily Special */}
                <div className="absolute top-0 right-0 flex flex-col items-end gap-1 p-2 pointer-events-none">
                  {(userProfile?.energy || 0) < config.dailySpecial.costEnergy && (
                    <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 shadow-lg border border-red-400/50 animate-pulse">SEM ENERGIA</span>
                  )}
                  {(userProfile?.action_points || 0) < config.dailySpecial.costPA && (
                    <span className="bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 shadow-lg border border-orange-400/50">SEM PA</span>
                  )}
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-500 text-black text-[10px] font-black uppercase">Especial do Dia</span>
                      <h2 className="text-2xl font-black text-white uppercase font-orbitron italic">{config.dailySpecial.name}</h2>
                    </div>
                    <p className="text-sm text-zinc-400 max-w-lg">
                      Uma oportunidade única que surge a cada 24h. O risco é extremo, mas a recompensa pode mudar o rumo da sua carreira no crime.
                    </p>
                    <div className="flex gap-4 pt-2">
                      <span className="text-emerald-500 font-black text-xs">EST. ${config.dailySpecial.money[0].toLocaleString()}</span>
                      <span className="text-violet-400 font-black text-xs">EST. +{config.dailySpecial.xp[0].toLocaleString()} XP</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => handleHeist(config.dailySpecial.id)}
                      disabled={
                        loadingAction !== null || 
                        (userProfile?.level || 0) < config.dailySpecial.level || 
                        (userProfile?.energy || 0) < config.dailySpecial.costEnergy ||
                        (userProfile?.action_points || 0) < config.dailySpecial.costPA ||
                        dailyCountdown !== null
                      }
                      className={`w-full px-8 py-3 transition-all font-black uppercase tracking-widest text-sm relative group/btn ${
                        dailyCountdown 
                          ? "bg-zinc-900 border border-orange-500/50 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                          : "bg-orange-600 hover:bg-orange-500 text-black disabled:bg-zinc-800 disabled:opacity-50"
                      }`}
                      style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
                    >
                      {dailyCountdown ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-[10px] opacity-70">RECARREGANDO GOLPE</span>
                          <span className="text-lg font-orbitron">{dailyCountdown}</span>
                        </div>
                      ) : (
                        "EXECUTAR GOLPE"
                      )}
                    </button>
                    
                    {/* Botão de Recarga no Daily Special */}
                    <button
                      disabled={
                        (userProfile?.money || 0) < Math.floor(1600 * (1 + (userProfile?.toxicity || 0) / 250)) || 
                        (userProfile?.energy || 0) >= 100 || 
                        (userProfile?.action_points || 0) < 600 ||
                        dailyCountdown !== null
                      }
                      onClick={() => handleQuickSupply('full_refill')}
                      className={`w-full p-2 border transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2 ${
                        dailyCountdown 
                          ? "bg-zinc-950 border-rose-500/20 text-rose-500/50" 
                          : "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-30 disabled:grayscale"
                      }`}
                    >
                      <UtensilsIcon className="w-4 h-4" /> RECARGA 100% EN
                    </button>
                  </div>
                </div>
             </div>
          )}

          {/* Pending Interception Resolution */}
          <AnimatePresence>
            {(pendingInterception || showInterception) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 border-2 border-red-500/50 bg-red-500/10 rounded-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-1 bg-red-500 text-black text-[8px] font-black uppercase px-2">AÇÃO REQUERIDA</div>
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-10 h-10 text-red-500 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-xl font-black text-white uppercase font-orbitron">Interceptação Bem Sucedida!</h3>
                    <p className="text-sm text-zinc-400">
                      Você interceptou <span className="text-red-500 font-bold">{pendingInterception?.targetName}</span> durante o roubo &quot;{pendingInterception?.heistName}&quot;.
                      Os itens confiscados estão sob sua custódia. O que deseja fazer?
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => handleResolveInterception('report')}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <ScaleIcon className="w-4 h-4" /> CORREGEDORIA
                    </button>
                    <button 
                      onClick={() => handleResolveInterception('sell')}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-orange-500 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <UserGroupIcon className="w-4 h-4" /> VENDER (ILEGAL)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <BriefcaseIcon className="w-4 h-4 opacity-50" />
                {faction === 'gangsters' ? "Operações Disponíveis" : "Tarefas da Central"}
              </h3>
              <span className="text-[10px] font-bold text-zinc-600 uppercase">Filtro: Nível Decrescente</span>
            </div>

            <div className="space-y-6">
              {/* Active Tasks Grid (Página 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTasks.length > 0 ? (
                  activeTasks.map(task => (
                    <ActionCard 
                      key={task.id} 
                      data={task} 
                      type={faction === 'gangsters' ? "heist" : "task"}
                      userLevel={userProfile?.level || 0}
                      userEnergy={userProfile?.energy || 0}
                      userPA={userProfile?.action_points || 0}
                      userTox={userProfile?.toxicity || 0}
                      userMoney={userProfile?.money || 0}
                      disabled={loadingAction !== null || cooldown > 0}
                      cooldown={cooldown}
                      onAction={faction === 'gangsters' ? handleHeist : handleGuardianTask}
                      onSupply={handleQuickSupply}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-900 rounded-sm">
                    <BriefcaseIcon className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">Nenhuma operação detectada no radar</p>
                  </div>
                )}
              </div>

              {/* Toggle Histórico (Página 2) */}
              {historyTasks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => setShowHistory(!showHistory)}
                      className="px-6 py-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                      style={MILITARY_CLIP}
                    >
                      <LockClosedIcon className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                      {showHistory ? "Ocultar Histórico de Operações" : `Ver Contratos Concluídos (${historyTasks.length})`}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden border-t border-zinc-900 pt-4"
                      >
                        {historyTasks.map(task => (
                          <div key={task.id} className="opacity-40 grayscale hover:opacity-60 transition-opacity">
                            <ActionCard 
                              data={task} 
                              type={faction === 'gangsters' ? "heist" : "task"}
                              userLevel={userProfile?.level || 0}
                              userEnergy={userProfile?.energy || 0}
                              userPA={userProfile?.action_points || 0}
                              userTox={userProfile?.toxicity || 0}
                              userMoney={userProfile?.money || 0}
                              disabled={true}
                              cooldown={cooldown}
                              onAction={() => {}}
                              onSupply={() => {}}
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}