import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  ClockIcon, 
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  FireIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types ---
interface ActiveContract {
  id: string;
  territory_id: string;
  territory_name: string;
  status: 'pending' | 'active' | 'completed' | 'intercepted';
  prep_vigiar_seguranca: boolean;
  prep_hackear_cameras: boolean;
  prep_preparar_rota: boolean;
  execution_ends_at: string | null;
}

interface District {
  id: string;
  name: string;
  heat: number;
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

interface ActiveHeist {
  id: string;
  territory_name: string;
  renegade_name: string;
}

interface ContractStatus {
  activeContract: ActiveContract | null;
  districts: District[];
  logs: ContractLog[];
  activeHeists: ActiveHeist[];
}

// --- Components ---

const TaskCard = ({ id, name, costPA, costEnergy, done, onAction, disabled }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className={`p-4 border-2 transition-all cursor-pointer relative overflow-hidden ${
      done 
        ? "border-green-500/30 bg-green-500/5 opacity-60" 
        : "border-zinc-800 bg-zinc-900/50 hover:border-cyan-500/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    onClick={() => !done && !disabled && onAction(id)}
  >
    <div className="flex justify-between items-start mb-4">
      <h4 className={`font-black uppercase tracking-tighter text-sm ${done ? "text-green-500" : "text-white"}`}>
        {name}
      </h4>
      {done && <ShieldCheckIcon className="w-5 h-5 text-green-500" />}
    </div>
    
    <div className="flex gap-4">
      <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase">
        <BoltIcon className="w-3 h-3" />
        {costPA} PA
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 uppercase">
        <BoltIcon className="w-3 h-3" />
        {costEnergy} NRG
      </div>
    </div>

    {!done && (
      <div className="absolute bottom-0 right-0 p-1 bg-cyan-500 text-[8px] font-black text-black uppercase tracking-tighter">
        Ação Necessária
      </div>
    )}
  </motion.div>
);

const Timer = ({ endsAt, onComplete }: { endsAt: string, onComplete: () => void }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const end = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
        onComplete();
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onComplete]);

  return (
    <div className="text-4xl font-black font-orbitron tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
      {timeLeft}
    </div>
  );
};

export default function ContractsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { userProfile, refreshProfile } = useUserProfileContext();
  const { data, mutate } = useSWR<ContractStatus>("/contracts/status", (url: string) => api.get(url).then(r => r.data));
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<ContractLog[]>([]);

  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
  const faction = (FACTION_ALIAS_MAP_FRONTEND[factionName.toLowerCase().trim()] || 'gangsters') as 'gangsters' | 'guardas';

  useEffect(() => {
    if (data?.logs) setLocalLogs(data.logs);
  }, [data]);

  useEffect(() => {
    socketService.on("contract:log", (newLog: ContractLog) => {
      setLocalLogs(prev => [newLog, ...prev.slice(0, 19)]);
    });

    socketService.on("contract:crime_alert", (alert: any) => {
      // Notificar ou atualizar lista de alertas
      mutate();
    });

    return () => {
      socketService.off("contract:log");
      socketService.off("contract:crime_alert");
    };
  }, [mutate]);

  const handlePrepare = async (taskId: string, territoryId?: string) => {
    setLoadingAction(taskId);
    try {
      await api.post("/contracts/prepare", { taskId, territoryId });
      await mutate();
      await refreshProfile();
      showToast("Operação atualizada.", "success");
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro ao preparar", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExecuteHeist = async () => {
    setLoadingAction("execute");
    try {
      await api.post("/contracts/execute");
      await mutate();
      await refreshProfile();
    } catch (e: any) {
      alert(e.response?.data?.error || "Erro ao executar");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResolveHeist = async () => {
    setLoadingAction("resolve");
    try {
      const res = await api.post("/contracts/resolve");
      showToast(res.data.message, res.data.success ? "success" : "warning");
      await mutate();
      await refreshProfile();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro ao finalizar", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGuardianAction = async (actionId: string) => {
    setLoadingAction(actionId);
    try {
      const res = await api.post("/contracts/guardian-action", { actionId });
      showToast(res.data.message, "success");
      await mutate();
      await refreshProfile();
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro ao patrulhar", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleIntercept = async (contractId: string) => {
    setLoadingAction("intercept");
    try {
      const res = await api.post("/contracts/intercept", { contractId });
      showToast(res.data.message, "success");
      
      // SÊNIOR: Redireciona para a tela de combate com os dados da interceptação
      if (res.data.targetId) {
        navigate(`/reckoning?targetId=${res.data.targetId}&targetName=${encodeURIComponent(res.data.targetName)}&type=intercept`);
      } else {
        await mutate();
        await refreshProfile();
      }
    } catch (e: any) {
      showToast(e.response?.data?.error || "Erro ao interceptar", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const activeHeist = data?.activeContract?.status === 'active';
  const prepDone = data?.activeContract?.prep_vigiar_seguranca && 
                   data?.activeContract?.prep_hackear_cameras && 
                   data?.activeContract?.prep_preparar_rota;

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recursos Atuais</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-xl font-black text-white font-orbitron">${userProfile?.money?.toLocaleString()}</span>
            <CurrencyDollarIcon className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pontos de Ação</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-xl font-black text-white font-orbitron">{userProfile?.action_points?.toLocaleString()}</span>
            <BoltIcon className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nível de {faction === 'gangsters' ? 'Infâmia' : 'Mérito'}</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-xl font-black text-white font-orbitron">
              {faction === 'gangsters' ? userProfile?.corruption : userProfile?.merit}
            </span>
            {faction === 'gangsters' ? <FireIcon className="w-5 h-5 text-orange-500" /> : <ShieldCheckIcon className="w-5 h-5 text-blue-500" />}
          </div>
        </div>
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Energia Vital</p>
          <div className="flex items-end justify-between mt-1">
            <span className="text-xl font-black text-white font-orbitron">{userProfile?.energy}%</span>
            <BoltIcon className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-2 space-y-6">
          {faction === 'gangsters' ? (
              !data?.activeContract ? (
                <div className="space-y-6">
                  <div className="p-6 border-l-4 border-orange-500 bg-zinc-900/40 relative overflow-hidden">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-orbitron italic">
                      Selecionar Alvo
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Escolha um distrito para iniciar o planejamento. Distritos com alto HEAT são mais perigosos, mas podem esconder tesouros maiores.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.districts.map(district => (
                      <div 
                        key={district.id}
                        className="p-4 border border-zinc-800 bg-zinc-900/60 hover:border-orange-500/50 transition-all group relative cursor-pointer"
                        onClick={() => handlePrepare("vigiar", district.id)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-black text-white uppercase tracking-widest">{district.name}</h4>
                          <div className="text-[8px] font-black px-2 py-1 bg-zinc-800 text-zinc-500 rounded-sm group-hover:bg-orange-500 group-hover:text-black transition-colors">
                            SELECT TARGET
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-[8px] font-bold text-zinc-500 uppercase mb-1">
                              <span>Vigilância</span>
                              <span>{district.heat}% HEAT</span>
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${district.heat > 70 ? 'bg-red-500' : district.heat > 30 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${district.heat}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 border-l-4 border-cyan-500 bg-zinc-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <UserGroupIcon className="w-24 h-24" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-orbitron italic">
                      Operação: {data?.activeContract?.territory_name}
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-md">
                      O plano está em andamento. Complete as tarefas de preparação para maximizar suas chances de sucesso antes do grande golpe.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TaskCard 
                      id="vigiar" 
                      name="Vigiar Segurança" 
                      costPA={100} 
                      costEnergy={5} 
                      done={data?.activeContract?.prep_vigiar_seguranca}
                      onAction={handlePrepare}
                      disabled={loadingAction !== null || activeHeist}
                    />
                    <TaskCard 
                      id="hackear" 
                      name="Hackear Câmeras" 
                      costPA={150} 
                      costEnergy={10} 
                      done={data?.activeContract?.prep_hackear_cameras}
                      onAction={handlePrepare}
                      disabled={loadingAction !== null || activeHeist}
                    />
                    <TaskCard 
                      id="rota" 
                      name="Preparar Rota" 
                      costPA={200} 
                      costEnergy={15} 
                      done={data?.activeContract?.prep_preparar_rota}
                      onAction={handlePrepare}
                      disabled={loadingAction !== null || activeHeist}
                    />
                  </div>

                  <div className="p-8 border-2 border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center text-center space-y-6">
                    {!activeHeist ? (
                      <>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-white uppercase tracking-widest font-orbitron">
                            Pronto para Agir
                          </h3>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                            {prepDone ? "Preparação 100% - Chances Ótimas" : "Preparação Incompleta - Risco Alto"}
                          </p>
                        </div>

                        <button 
                          onClick={handleExecuteHeist}
                          disabled={loadingAction !== null}
                          className="group relative px-12 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:opacity-50 transition-all"
                          style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
                        >
                          <div className="flex items-center gap-3">
                            <FireIcon className="w-6 h-6 text-black group-hover:animate-bounce" />
                            <span className="text-black font-black uppercase tracking-[0.3em] font-orbitron">Executar Roubo</span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 text-[8px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                            Gasto: 80 NRG
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-xl animate-pulse" />
                            <Timer 
                              endsAt={data?.activeContract?.execution_ends_at || ""} 
                              onComplete={() => mutate()} 
                            />
                          </div>
                          <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                            <ShieldExclamationIcon className="w-4 h-4 text-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sinal Emitido - Vigilância Ativa</span>
                          </div>
                        </div>

                        {data?.activeContract?.execution_ends_at && new Date(data.activeContract.execution_ends_at) <= new Date() && (
                          <button 
                            onClick={handleResolveHeist}
                            className="px-12 py-4 bg-green-600 hover:bg-green-500 text-black font-black uppercase tracking-widest font-orbitron"
                          >
                            Finalizar e Coletar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
            <div className="space-y-6">
               <div className="p-6 border-l-4 border-blue-500 bg-zinc-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <ShieldCheckIcon className="w-24 h-24" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 font-orbitron italic">
                  Central de Vigilância
                </h2>
                <p className="text-sm text-zinc-400 max-w-md">
                  Mantenha a ordem nos distritos. Responda a chamados ativos ou realize rondas para garantir a segurança da metrópole.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="p-6 border border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => handleGuardianAction('ronda')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-sm">
                      <MapPinIcon className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-white uppercase tracking-widest">Fazer Ronda</h4>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Patrulha de Baixo Risco</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-cyan-400 uppercase">100 PA</span>
                    <span className="text-emerald-500 uppercase">+$500 / +50 MÉR</span>
                  </div>
                </div>

                <div 
                  className="p-6 border border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => handleGuardianAction('investigacao')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-sm">
                      <MagnifyingGlassIcon className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-white uppercase tracking-widest">Investigação</h4>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Busca por Pistas Criminais</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-cyan-400 uppercase">300 PA</span>
                    <span className="text-emerald-500 uppercase">+$1200 / +150 MÉR</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldExclamationIcon className="w-4 h-4 text-orange-500" />
                  Crimes em Andamento (Interceptação)
                </h3>
                
                <div className="space-y-2">
                  <AnimatePresence>
                    {(data?.activeHeists?.length ?? 0) > 0 ? (
                       data?.activeHeists?.map((heist: ActiveHeist) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 bg-red-500/5 border border-red-500/20 rounded-sm flex justify-between items-center group hover:bg-red-500/10 transition-all"
                          key={heist.id}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 animate-pulse" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-tighter">
                                {heist.territory_name} <span className="text-zinc-500 mx-1">/</span> <span className="text-red-500">{heist.renegade_name}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <ClockIcon className="w-3 h-3 text-zinc-500" />
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Resposta Imediata Necessária</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleIntercept(heist.id)}
                            disabled={loadingAction !== null}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-black font-black text-[10px] uppercase tracking-widest transition-all"
                            style={{ clipPath: "polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)" }}
                          >
                            Interceptar
                          </button>
                        </motion.div>
                       ))
                    ) : (
                      <div className="py-8 border border-dashed border-zinc-900 flex flex-col items-center opacity-30 text-center">
                        <ShieldCheckIcon className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma atividade hostil de alto nível</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  Monitoramento de Distritos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data?.districts.map(district => (
                    <div className="p-3 bg-zinc-900/60 border border-zinc-800 flex justify-between items-center" key={district.id}>
                      <span className="text-[10px] font-black text-zinc-400 uppercase">{district.name}</span>
                      <div className="flex items-center gap-2">
                         <div className="h-1 w-16 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${district.heat}%` }} />
                          </div>
                          <span className="text-[8px] font-black text-zinc-600 uppercase">{district.heat}% HEAT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
              <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 animate-pulse rounded-full" />
                Live_Network_Log
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              <AnimatePresence initial={false}>
                {localLogs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-sm relative"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[8px] font-black uppercase px-1 ${
                        log.faction === 'gangsters' ? 'bg-orange-500 text-black' : 'bg-blue-500 text-white'
                      }`}>
                        {log.faction === 'gangsters' ? 'Renegado' : 'Guardião'}
                      </span>
                      <span className="text-[8px] text-zinc-600 font-mono">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {log.message}
                    </p>
                    <div className="mt-2 flex items-center gap-1 opacity-50">
                      <MapPinIcon className="w-3 h-3" />
                      <span className="text-[8px] font-bold uppercase">{log.territory_name}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                <span>Total Operações: {localLogs.length}</span>
                <span>Uptime: 99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}