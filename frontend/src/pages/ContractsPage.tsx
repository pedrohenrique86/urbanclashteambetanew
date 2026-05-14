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
import { calculateDynamicLevel } from "../utils/leveling";

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

const ActionCard = ({ data, onAction, disabled, userLevel, userEnergy, userPA, userTox, userMoney, type, cooldown, onSupply, isCompleted }: any) => {
  const isLocked = userLevel < data.level;
  const hasResources = (userEnergy >= (data.costEnergy || 0)) && (userPA >= (data.costPA || 0));
  const isRenegade = type === 'heist';

  // SÊNIOR: Cálculo de custos de recarga
  const REFILL_BASE_CASH = 1600;
  const REFILL_PA = 600;
  const calculateFullRefillCost = () => {
    const toxicityMultiplier = 1 + (userTox / 250);
    return Math.floor(REFILL_BASE_CASH * toxicityMultiplier);
  };
  const refillCost = calculateFullRefillCost();
  const canAffordRefill = userMoney >= refillCost && userPA >= REFILL_PA;

  // SÊNIOR: Atribuição dinâmica de ícones e sub-roles baseada no nível do contrato
  const getRoleInfo = () => {
    if (isRenegade) {
      if (data.level <= 5) return { role: "PEQUENO GOLPE", icon: <BriefcaseIcon className="w-8 h-8 text-orange-400" /> };
      if (data.level <= 15) return { role: "OPERAÇÃO URBANA", icon: <MapPinIcon className="w-8 h-8 text-orange-500" /> };
      return { role: "CRIME ORGANIZADO", icon: <FireIcon className="w-8 h-8 text-red-500" /> };
    } else {
      if (data.level <= 5) return { role: "PATRULHA DE ROTINA", icon: <ShieldCheckIcon className="w-8 h-8 text-blue-400" /> };
      if (data.level <= 15) return { role: "SEGURANÇA TÁTICA", icon: <ShieldCheckIcon className="w-8 h-8 text-blue-500" /> };
      return { role: "COMANDO ELITE", icon: <ScaleIcon className="w-8 h-8 text-cyan-500" /> };
    }
  };

  const { role, icon } = getRoleInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative cyber-card cyber-card-copper transition-all duration-300 hover:bg-white/5 
        ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}
      style={MILITARY_CLIP}
    >
      <div className="p-6 flex flex-col gap-5">
        {/* HEADER: ICON & ROLE */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
          <div className="p-3 bg-white/5 border border-white/10 relative">
            {icon}
            {isLocked && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                 <LockClosedIcon className="w-5 h-5 text-white/40" />
               </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-orbitron font-black text-white tracking-widest uppercase leading-none">{data.name}</h3>
            <span className="text-[10px] font-black text-orange-500/80 tracking-[0.2em] uppercase mt-1 block">
              {isLocked ? "SISTEMA BLOQUEADO" : role}
            </span>
          </div>
          {!isLocked && cooldown > 0 && (
            <div className="ml-auto bg-red-500/10 border border-red-500/30 px-2 py-1">
              <span className="text-xs font-black text-red-500 animate-pulse">{cooldown}S</span>
            </div>
          )}
        </div>

        {/* INFO: LEVEL & REQUIREMENTS */}
        <div className="flex justify-between items-center bg-black/40 p-2 border border-white/5">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500"></div>
              <span className="text-[10px] font-mono text-slate-400">REQ_LEVEL:</span>
              <span className="text-sm font-black text-white font-orbitron">{data.level}</span>
           </div>
           {isLocked && (
             <span className="text-[9px] font-black text-red-500/80 uppercase tracking-widest">Nível Insuficiente</span>
           )}
        </div>

        {/* COSTS GRID (3 Columns) */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 border flex flex-col items-center ${userPA < data.costPA ? 'bg-red-500/10 border-red-500/30' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
            <BoltIcon className={`w-3 h-3 mb-1 ${userPA < data.costPA ? 'text-red-500' : 'text-cyan-400'}`} />
            <span className={`text-[10px] font-bold ${userPA < data.costPA ? 'text-red-200' : 'text-cyan-200'}`}>{data.costPA} PA</span>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 flex flex-col items-center">
            <FireIcon className="w-3 h-3 text-yellow-500 mb-1" />
            <span className="text-[10px] font-bold text-yellow-200">{data.costEnergy} NRG</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 flex flex-col items-center">
            <CurrencyDollarIcon className="w-3 h-3 text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold text-emerald-200">
               {isRenegade ? 'LUCRO' : 'SALÁRIO'}
            </span>
          </div>
        </div>

        {/* GAINS BADGES */}
        <div className="flex flex-wrap gap-2 justify-center py-2 border-y border-white/5">
          <div className="bg-emerald-500/5 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold">
            <span className="text-emerald-400">${isRenegade ? data.money[0].toLocaleString() : data.salary[0].toLocaleString()}</span> CASH
          </div>
          <div className="bg-violet-500/5 border border-violet-500/20 px-3 py-1 text-[10px] font-bold">
            <span className="text-violet-400">+{data.xp[0].toLocaleString()}</span> XP
          </div>
          {isRenegade ? (
            <div className="bg-orange-500/5 border border-orange-500/20 px-3 py-1 text-[10px] font-bold">
               <span className="text-orange-400">+{data.lootChance}%</span> LOOT
            </div>
          ) : (
            <div className="bg-blue-500/5 border border-blue-500/20 px-3 py-1 text-[10px] font-bold">
               <span className="text-blue-400">+{data.merit?.[0] || 0}</span> MÉRITO
            </div>
          )}
        </div>

        {/* RECARGA RÁPIDA (Dentro do Card) */}
        {!isLocked && userEnergy < (data.costEnergy || 0) && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled={!canAffordRefill || userEnergy >= 100}
            onClick={(e) => { e.stopPropagation(); onSupply('full_refill'); }}
            className={`w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black border transition-all military-clip ${
              canAffordRefill && userEnergy < 100
                ? "bg-black/80 hover:bg-rose-900/40 border-rose-500/40 text-rose-500 hover:text-white"
                : "bg-zinc-950 border-zinc-900 text-zinc-700 grayscale cursor-not-allowed"
            }`}
          >
            <UtensilsIcon className="w-3 h-3" />
            <span>RECARGA DE CAMPO (Custo: ${refillCost})</span>
          </motion.button>
        )}

        <button
          onClick={() => onAction(data.id)}
          disabled={isLocked || disabled || !hasResources || isCompleted}
          className={`w-full py-4 cyber-button-copper military-clip
            ${isLocked || !hasResources || isCompleted ? 'opacity-50 grayscale' : ''}`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
             {isCompleted ? 'CONTRATO CONCLUÍDO' : 
              (!hasResources ? (
               userEnergy < (data.costEnergy || 0) ? 'ENERGIA INSUFICIENTE' : 'PA INSUFICIENTE'
             ) : (
               isRenegade ? 'EXECUTAR OPERAÇÃO' : 'ASSUMIR TAREFA'
             ))}
          </span>
        </button>
      </div>

      {/* Decorative side bar for the card (Copper/Bronze) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#B87333] via-[#CD7F32] to-[#8B4513] shadow-[0_0_10px_rgba(184,115,51,0.5)]`}>
      </div>
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
  const [masterHeistAlert, setMasterHeistAlert] = useState<{ username: string, expiresAt: number } | null>(null);

  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
  const faction = (FACTION_ALIAS_MAP_FRONTEND[factionName.toLowerCase().trim()] || 'gangsters') as 'gangsters' | 'guardas';

  // Listen for Master Heist Alert (Guardians)
  useEffect(() => {
    const handleAlert = (data: { username: string, expiresAt: number }) => {
      if (faction === 'guardas') {
        setMasterHeistAlert(data);
        showToast(`ALERTA NÍVEL 5: ${data.username} executando Golpe de Mestre!`, 'warning');
      }
    };

    socketService.on('contract:master_heist_alert', handleAlert);
    
    const interval = setInterval(() => {
      setMasterHeistAlert(prev => {
        if (!prev) return null;
        if (Date.now() > prev.expiresAt) return null;
        return prev;
      });
    }, 1000);

    return () => {
      socketService.off('contract:master_heist_alert', handleAlert);
      clearInterval(interval);
    };
  }, [faction, showToast]);

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


  useEffect(() => {
    if (status?.logs) setLocalLogs(status.logs);
  }, [status]);

  // Lógica de Filtragem de Tarefas (Página 1 e Página 2)
  const allTasks = faction === 'gangsters' ? (config?.heists || []) : (config?.guardianTasks || []);
  const userLvl = calculateDynamicLevel(userProfile);
  const unlockedTasks = allTasks.filter(t => t.level <= userLvl);
  const nextLockedTask = allTasks.find(t => t.level > userLvl);
  
  // Página 1: Ativos (2 mais recentes desbloqueados + próximo bloqueado)
  let activeTasks: any[] = [];
  if (allTasks.length > 0) {
    if (!nextLockedTask) {
      // Se desbloqueou tudo, mostra apenas a última (Elite)
      activeTasks = allTasks.slice(-1);
    } else {
      // SÊNIOR: Apenas 1 mais recente desbloqueado + o próximo que está trancado
      activeTasks = [...unlockedTasks.slice(-1), nextLockedTask];
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
      showToast(res.data.message, "success");
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
      showToast(res.data.message, "success");
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
    <div className="min-h-screen bg-transparent text-zinc-300 font-sans p-4 md:p-6 space-y-8 max-w-7xl mx-auto relative">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-tactical-grid opacity-10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B87333] rounded-full blur-[150px] opacity-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[150px] opacity-10"></div>
      </div>

      {/* HEADER: Title & Subtitle (Aesthetics matched with TrainingPage) */}
      <header className="max-w-7xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#B87333] shadow-[0_0_15px_rgba(184,115,51,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              {/* Badge SEC LEVEL Estilizado */}
              <div className="flex items-center overflow-hidden border border-[#B87333]/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-[#B87333] px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">AUTH_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-[#CD7F32] font-bold tracking-widest">07_OPS_COMMAND</span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-800"></div>

              <span className="text-[10px] font-mono text-[#CD7F32]/80 animate-pulse tracking-widest font-bold uppercase">● Ops_Network_Active</span>
            </div>
            
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-[#B87333]/50 w-fit backdrop-blur-sm">
              CENTRAL DE OPERAÇÕES TÁTICAS // PROTOCOLO {faction === 'gangsters' ? 'RENEGADO' : 'GUARDIÃO'}
            </p>
          </div>
        </motion.div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {[
          { label: "Capital Líquido", val: `$${userProfile?.money?.toLocaleString()}`, color: "text-emerald-400", icon: BanknotesIcon, border: "border-emerald-500/20" },
          { label: "Foco (PA)", val: userProfile?.action_points?.toLocaleString(), color: "text-cyan-400", icon: BoltIcon, border: "border-cyan-500/20" },
          { label: faction === 'gangsters' ? "Infâmia Urbana" : "Mérito Policial", val: faction === 'gangsters' ? userProfile?.corruption : userProfile?.merit, color: faction === 'gangsters' ? "text-[#CD7F32]" : "text-blue-500", icon: faction === 'gangsters' ? FireIcon : ShieldCheckIcon, border: faction === 'gangsters' ? "border-[#B87333]/20" : "border-blue-500/20" },
          { label: "Reserva de Energia", val: `${userProfile?.energy}%`, color: "text-yellow-500", icon: BoltIcon, border: "border-yellow-500/20" }
        ].map((stat, i) => (
          <div key={i} className={`p-4 bg-black/60 backdrop-blur-md border ${stat.border} relative overflow-hidden group`} style={MILITARY_CLIP}>
            <div className="absolute top-0 right-0 p-1 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-12 h-12 text-white" />
            </div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-black font-orbitron ${stat.color}`}>{stat.val}</span>
            </div>
          </div>
        ))}

        {/* Manual Trigger */}
        <button 
          onClick={() => setIsManualOpen(true)}
          className="col-span-2 md:col-span-4 p-4 cyber-button-copper military-clip group flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="flex items-center gap-4 relative z-10">
            <InformationCircleIcon className="w-6 h-6 text-[#CD7F32] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">MANUAL TÁTICO DE OPERAÇÕES</span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-[8px] font-mono text-[#B87333] uppercase opacity-60">Consultar Protocolos</span>
            <div className="w-2 h-2 bg-[#CD7F32] rounded-full animate-pulse shadow-[0_0_8px_#CD7F32]" />
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
             <div className="relative group overflow-hidden p-8 border border-[#B87333]/40 bg-black/60 backdrop-blur-xl rounded-sm" style={MILITARY_CLIP}>
                {/* Premium Glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#B87333] rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity animate-pulse"></div>
                
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                  <SparklesIcon className="w-48 h-48 text-[#CD7F32]" />
                </div>

                {/* Badges do Daily Special */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none z-20">
                  {(userProfile?.energy || 0) < config.dailySpecial.costEnergy && (
                    <span className="bg-red-600/90 text-white text-[9px] font-black px-3 py-1 shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-400/50 animate-pulse uppercase tracking-widest">ENERGIA_CRÍTICA</span>
                  )}
                  {(userProfile?.action_points || 0) < config.dailySpecial.costPA && (
                    <span className="bg-orange-600/90 text-white text-[9px] font-black px-3 py-1 shadow-[0_0_15px_rgba(234,88,12,0.5)] border border-orange-400/50 uppercase tracking-widest">SINAL_DE_FOCO_BAIXO</span>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-[#B87333]"></div>
                        <span className="text-[10px] font-black text-[#CD7F32] uppercase tracking-[0.4em]">PROTOCOLO_GOLPE_DE_MESTRE</span>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white uppercase font-orbitron tracking-tighter leading-none italic">
                        {config.dailySpecial.name}
                      </h2>
                    </div>
                    
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl font-medium border-l border-white/10 pl-6 italic">
                      &quot;A oportunidade de ouro. Uma falha na segurança central foi detectada. O risco é letal, a visibilidade é total, mas o pagamento é lendário.&quot;
                    </p>

                    <div className="flex flex-wrap gap-6 pt-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pagamento Estimado</span>
                        <span className="text-2xl font-black text-emerald-400 font-orbitron">${config.dailySpecial.money[0].toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Evolução de Perfil</span>
                        <span className="text-2xl font-black text-violet-400 font-orbitron">+{config.dailySpecial.xp[0].toLocaleString()} XP</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nível Mínimo</span>
                        <span className="text-2xl font-black text-white font-orbitron">Lvl {config.dailySpecial.level}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 w-full lg:w-80">
                    <button 
                      onClick={() => handleHeist(config.dailySpecial.id)}
                      disabled={
                        loadingAction !== null || 
                        userLvl < config.dailySpecial.level || 
                        (userProfile?.energy || 0) < config.dailySpecial.costEnergy ||
                        (userProfile?.action_points || 0) < config.dailySpecial.costPA ||
                        dailyCountdown !== null
                      }
                      className={`w-full px-8 py-5 transition-all font-black uppercase tracking-[0.2em] text-sm relative group/btn overflow-hidden military-clip
                        ${dailyCountdown 
                          ? "bg-black/40 border border-[#B87333]/30 text-[#CD7F32]" 
                          : "cyber-button-copper text-white hover:scale-[1.02]"
                        }`}
                    >
                      {dailyCountdown ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-[9px] opacity-60 mb-2">RECARREGANDO SISTEMAS</span>
                          <span className="text-2xl font-orbitron tracking-widest">{dailyCountdown}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <FireIcon className="w-6 h-6 animate-pulse" />
                          <span>EXECUTAR OPERAÇÃO</span>
                        </div>
                      )}
                    </button>
                    
                    <button
                      disabled={
                        (userProfile?.money || 0) < Math.floor(1600 * (1 + (userProfile?.toxicity || 0) / 250)) || 
                        (userProfile?.energy || 0) >= 100 || 
                        (userProfile?.action_points || 0) < 600 ||
                        dailyCountdown !== null
                      }
                      onClick={() => handleQuickSupply('full_refill')}
                      className={`w-full py-3 border transition-all text-[10px] font-black uppercase flex items-center justify-center gap-3 military-clip
                        ${dailyCountdown 
                          ? "bg-black/40 border-rose-500/10 text-rose-500/30" 
                          : "bg-black/80 border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-30"
                        }`}
                    >
                      <UtensilsIcon className="w-4 h-4" /> RECARGA TÁTICA COMPLETA
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
                      userLevel={userLvl}
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
              </div> {/* Final do grid (731) */}
            </div> {/* Final do space-y-6 (729) */}
          </div> {/* Final do space-y-4 (720) */}

          {/* Interface do Guardião (Polícia/Segurança) - Alerta de Intervenção */}
          {faction === 'guardas' && masterHeistAlert && (
            <div className="pt-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-6 border-2 border-red-500 bg-red-500/10 rounded-sm overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: (masterHeistAlert.expiresAt - Date.now()) / 1000, ease: "linear" }}
                    className="h-full bg-white"
                  />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 text-white rounded-full animate-ping shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                      <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-red-500 uppercase italic">Intervenção Prioritária</h3>
                      <p className="text-sm text-white/80">
                        {masterHeistAlert.username} detectado em operação crítica. Chance de interceptação: <span className="text-white font-bold">50%</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const bestTask = [...(config?.guardianTasks || [])].reverse().find(t => (userProfile?.level || 0) >= t.level);
                      if (bestTask) {
                        handleGuardianTask(bestTask.id);
                      } else {
                        showToast("Nenhuma tarefa de interceptação disponível para seu nível.", "error");
                      }
                    }}
                    disabled={loadingAction !== null}
                    className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
                  >
                    RESPONDER AO CHAMADO
                  </button>
                </div>
              </motion.div>
            </div>
          )}

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
                          isCompleted={true}
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
    )}
  </div>
  );
}