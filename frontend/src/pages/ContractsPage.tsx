import React, { useState, useEffect } from "react";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useToast } from "../contexts/ToastContext";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import useSWR from "swr";
import api from "../lib/api";
import { socketService } from "../services/socketService";
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
  BanknotesIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types ---
interface Heist {
  id: string;
  name: string;
  level: number;
  costPA: number;
  costEnergy: number;
  money: [number, number];
  xp: [number, number];
  attrChance: number;
  lootChance: number;
}

interface GuardianTask {
  id: string;
  name: string;
  level: number;
  costPA: number;
  salary: [number, number];
  merit: [number, number];
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

const ActionCard = ({ data, onAction, disabled, userLevel, userEnergy, userPA, type, cooldown }: any) => {
  const isLocked = userLevel < data.level;
  const hasResources = (userEnergy >= (data.costEnergy || 0)) && (userPA >= (data.costPA || 0));
  const isRenegade = type === 'heist';

  return (
    <motion.div 
      whileHover={!isLocked && !disabled ? { scale: 1.02, y: -2 } : {}}
      className={`relative p-4 border rounded-sm transition-all overflow-hidden ${
        isLocked 
          ? "bg-zinc-900/20 border-zinc-800/50 grayscale opacity-40" 
          : (!hasResources ? "bg-zinc-900/40 border-red-900/50 opacity-60" : "bg-zinc-900/40 border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/60")
      }`}
      onClick={() => !isLocked && !disabled && hasResources && onAction(data.id)}
    >
      <div className="flex justify-between items-start mb-3">
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
      
      <div className="flex flex-wrap gap-3 mt-4">
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${userPA < data.costPA ? 'text-red-500' : 'text-cyan-400'}`}>
          <BoltIcon className="w-3 h-3" />
          {data.costPA} PA
        </div>
        {isRenegade && (
          <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${userEnergy < data.costEnergy ? 'text-red-500' : 'text-yellow-500'}`}>
            <BoltIcon className="w-3 h-3" />
            {data.costEnergy} NRG
          </div>
        )}
        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase">
          <CurrencyDollarIcon className="w-3 h-3" />
          EST. ${data.money ? (isRenegade ? data.money[0].toLocaleString() : data.salary[0].toLocaleString()) : '0'}
        </div>
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] -rotate-12">Bloqueado</span>
        </div>
      )}
    </motion.div>
  );
};

export default function ContractsPage() {
  const { showToast } = useToast();
  const { userProfile, refreshProfile } = useUserProfileContext();
  const { data: config } = useSWR<ContractConfig>("/contracts/config", (url: string) => api.get(url).then(r => r.data));
  const { data: status, mutate } = useSWR<ContractStatus>("/contracts/status", (url: string) => api.get(url).then(r => r.data));
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<ContractLog[]>([]);
  const [showInterception, setShowInterception] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Daily Special */}
          {faction === 'gangsters' && config?.dailySpecial && (
             <div className="relative group overflow-hidden p-6 border border-orange-500/30 bg-orange-500/5 rounded-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <SparklesIcon className="w-32 h-32 text-orange-500" />
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
                  </div>
                  <button 
                    onClick={() => handleHeist(config.dailySpecial.id)}
                    disabled={
                      loadingAction !== null || 
                      (userProfile?.level || 0) < config.dailySpecial.level || 
                      (userProfile?.energy || 0) < config.dailySpecial.costEnergy ||
                      (userProfile?.action_points || 0) < config.dailySpecial.costPA
                    }
                    className="w-full md:w-auto px-8 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:opacity-50 transition-all font-black text-black uppercase tracking-widest text-sm"
                    style={{ clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)" }}
                  >
                    EXECUTAR GOLPE
                  </button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faction === 'gangsters' ? (
                config?.heists.map(heist => (
                  <ActionCard 
                    key={heist.id} 
                    data={heist} 
                    type="heist"
                    userLevel={userProfile?.level || 0}
                    userEnergy={userProfile?.energy || 0}
                    userPA={userProfile?.action_points || 0}
                    disabled={loadingAction !== null || cooldown > 0}
                    cooldown={cooldown}
                    onAction={handleHeist}
                  />
                ))
              ) : (
                config?.guardianTasks.map(task => (
                  <ActionCard 
                    key={task.id} 
                    data={task} 
                    type="task"
                    userLevel={userProfile?.level || 0}
                    userEnergy={userProfile?.energy || 0}
                    userPA={userProfile?.action_points || 0}
                    disabled={loadingAction !== null || cooldown > 0}
                    cooldown={cooldown}
                    onAction={handleGuardianTask}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: District Monitor */}
        <div className="lg:col-span-4 space-y-6">
          {/* District Monitor */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-sm space-y-4">
             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Monitoramento de Heat</h4>
             <div className="space-y-3">
                {/* Simulated or fetched district heat */}
                {['Centro', 'Subúrbio', 'Porto', 'Industrial'].map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black uppercase">
                      <span className="text-zinc-400">{d}</span>
                      <span className={i === 0 ? 'text-red-500' : 'text-zinc-600'}>{i === 0 ? '84%' : '22%'}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${i === 0 ? 'bg-red-500' : 'bg-zinc-700'}`} style={{ width: i === 0 ? '84%' : '22%' }} />
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}