import React from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, 
  ChevronRight, 
  Flame, 
  ShieldCheck,
  Cake,
  Beaker,
  Sparkles,
  Cpu,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { logService, NetworkLog } from "../services/logService";
import { useUserProfile } from "../hooks/useUserProfile";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

const LogIcon = ({ type, metadata }: { type: string, metadata: any }) => {
  switch (type) {
    case 'combat':
      return metadata.outcome?.startsWith('win') ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Flame className="w-4 h-4 text-rose-500" />;
    case 'training':
      return <Cpu className="w-4 h-4 text-cyan-400" />;
    case 'supply':
      return metadata.collapsed ? <AlertCircle className="w-4 h-4 text-orange-500" /> : <Cake className="w-4 h-4 text-yellow-400" />;
    case 'poison_clear':
      return <Beaker className="w-4 h-4 text-purple-400" />;
    default:
      return <ClipboardList className="w-4 h-4 text-slate-400" />;
  }
};

const LogContent = ({ log }: { log: NetworkLog }) => {
  const meta = log.metadata || {};
  
  switch (log.action_type) {
    case 'combat': {
      const outcome = meta.outcome;
      const isWin = outcome === 'win' || outcome?.startsWith('win');
      const isDraw = outcome === 'draw';
      const isLoss = outcome === 'loss' || outcome?.startsWith('loss');

      let label = "CONFLITO";
      let color = "text-slate-400";
      if (isWin) { label = "VITÓRIA"; color = "text-emerald-400"; }
      else if (isLoss) { label = "DERROTA"; color = "text-rose-400"; }
      else if (isDraw) { label = "EMPATE"; color = "text-yellow-500"; }

      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className={`${color} font-bold`}>
              {label} NO PROTOCOLO DE ACERTO DE CONTAS
            </span>
            <span className="text-slate-500 text-[10px]">vs {meta.target_name || "Desconhecido"}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] items-center">
            {meta.xp_gain !== 0 && (
              <span className={meta.xp_gain > 0 ? "text-emerald-400/80" : "text-rose-400/80"}>
                {meta.xp_gain > 0 ? `+${meta.xp_gain}` : meta.xp_gain} XP
              </span>
            )}
            {meta.money_gain > 0 && <span className="text-yellow-400/80">+${meta.money_gain}</span>}
            {meta.money_loss > 0 && <span className="text-rose-400/80">-${meta.money_loss}</span>}
            {meta.stats_gained && (
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3 ml-1">
                <span className="text-slate-400">ATK +{Number(meta.stats_gained.attack || meta.stats_gained.atk || 0).toFixed(2)}</span>
                <span className="text-slate-400">DEF +{Number(meta.stats_gained.defense || meta.stats_gained.def || 0).toFixed(2)}</span>
                <span className="text-slate-400">FOC +{Number(meta.stats_gained.focus || meta.stats_gained.foc || 0).toFixed(2)}</span>
              </div>
            )}
            {meta.is_rare && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 border border-red-500/30 rounded-sm font-black tracking-tighter">ALVO_HVT</span>}
          </div>
        </div>
      );
    }

    case 'training':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-cyan-400 font-bold uppercase tracking-tight">TREINAMENTO CONCLUÍDO</span>
            <span className="text-slate-500 text-[10px] uppercase">Módulo: {log.entity_id}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] items-center">
            <span className="text-emerald-400/80">+{meta.xp_gain} XP</span>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3 ml-1">
              <span className="text-slate-400">ATK +{meta.stats_gained?.atk}</span>
              <span className="text-slate-400">DEF +{meta.stats_gained?.def}</span>
              <span className="text-slate-400">FOC +{meta.stats_gained?.foc}</span>
            </div>
          </div>
        </div>
      );

    case 'supply':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold uppercase tracking-tight">MANUTENÇÃO BIOS: {log.entity_id}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] items-center">
            <span className="text-emerald-400/80">+{meta.energy_gained} ENERGIA</span>
            {meta.toxicity_added > 0 && <span className="text-rose-400/80">+{meta.toxicity_added} TOXICIDADE</span>}
            {meta.collapsed && <span className="text-rose-500 font-black animate-pulse">ALERTA_COLAPSO</span>}
          </div>
        </div>
      );

    case 'poison_clear':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-purple-400">
            <span className="font-bold uppercase tracking-tight">SISTEMA PURGADO</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] items-center">
             <span className="text-slate-400">Custo: ${meta.cost_cash}</span>
             <span className="text-emerald-400/80">-{meta.toxicity_cleared} Toxicidade</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-bold uppercase">{log.action_type}</span>
          <span className="text-slate-500 text-xs">Ação registrada no sistema.</span>
        </div>
      );
  }
};

export default function NetworkLogsPage() {
  const { userProfile } = useUserProfile();
  const [page, setPage] = React.useState(1);

  const { data: logs, error, mutate, isValidating } = useSWR(`/logs/me?page=${page}`, () => logService.getMyLogs(page), {
    refreshInterval: 30000, 
    revalidateOnFocus: true
  });

  // Estética Laranja Fixa conforme solicitado (estilo Reckoning)
  const theme = { 
    primary: "text-orange-500", 
    border: "border-orange-500/20", 
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]", 
    accent: "from-orange-500/20 to-transparent",
    textShadow: "2px 0px 0px rgba(249,115,22,0.7), -1px 0px 0px rgba(255,255,255,0.2)"
  };

  const PageButton = ({ p }: { p: number }) => (
    <button
      onClick={() => setPage(p)}
      className={`px-4 py-1.5 font-orbitron text-[10px] font-black border transition-all ${
        page === p 
          ? "bg-orange-500 text-black border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]" 
          : "bg-black/40 text-orange-500/50 border-orange-500/20 hover:border-orange-500/50 hover:text-orange-500"
      }`}
      style={MILITARY_CLIP}
    >
      SETOR_0{p}
    </button>
  );

  return (
    <div className="min-h-[80vh] p-4 md:p-8 font-sans text-slate-300 relative selection:bg-orange-500/30 overflow-hidden">
      
      {/* HUD DECORATION - CORNERS (Similar ao Reckoning) */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-orange-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-orange-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-orange-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-orange-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-orange-500/50"></div>
      </div>

      <header className="max-w-5xl mx-auto mb-6 relative z-10">
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)] hidden lg:block"></div>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 
              className="text-4xl md:text-6xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-4"
              style={{ textShadow: theme.textShadow }}
            >
              Network <span className={theme.primary}>Logs</span>
            </h1>
            <div className="flex items-center gap-4 mt-3">
              {/* Badge SEC LEVEL Estilizado */}
              <div className="flex items-center overflow-hidden border border-orange-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-orange-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">SEC_LEVEL</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-orange-400 font-bold tracking-widest">04_AUTHORIZED</span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-800"></div>

              <span className="text-[10px] font-mono text-orange-400/80 animate-pulse tracking-widest font-bold">● AUDIT_LIVE</span>
            </div>
            
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.25em] uppercase mt-3 bg-white/5 py-1 px-3 border-l-2 border-orange-500/50 w-fit backdrop-blur-sm">
              Terminal de Auditoria de Redes e Histórico de Unidade
            </p>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Nível de Acesso</span>
              <span className="text-[11px] font-orbitron font-bold text-orange-500">OPERADOR_RANK_{userProfile?.level || 1}</span>
            </div>
            <button 
              onClick={() => mutate()}
              disabled={isValidating}
              className={`p-4 bg-black/60 border border-slate-700 rounded-xl hover:border-orange-500/50 transition-all active:scale-95 group relative overflow-hidden`}
              style={MILITARY_CLIP}
            >
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* PAGINATION CONTROLS */}
      <div className="max-w-5xl mx-auto mb-4 flex justify-end gap-2 relative z-10 px-1">
         <span className="text-[9px] font-mono text-slate-500 uppercase self-center mr-4 tracking-widest opacity-60">Navegação de Setores:</span>
         <PageButton p={1} />
         <PageButton p={2} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="bg-black/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl" style={MILITARY_CLIP}>
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle,rgba(249,115,22,0.8)_1.5px,transparent:1.5px)] bg-[size:32px:32px]"></div>
          
          <div className="relative z-10 p-4 border-b border-slate-800 flex items-center justify-between bg-orange-500/5">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-orange-500/70" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.3em] font-bold">Relatório Cronológico tático</span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <span className="hidden md:block text-[9px] font-mono text-slate-600 tracking-tighter">UID_{userProfile?.id?.toUpperCase()}</span>
                <div className="h-4 w-px bg-slate-800"></div>
                <span className="text-[10px] font-mono text-orange-500/60 font-bold">LIVE_SYNC: OK</span>
             </div>
          </div>

          <div className="divide-y divide-slate-800/40 min-h-[300px]">
            {error && (
              <div className="p-20 text-center">
                <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-white font-orbitron font-bold text-sm mb-2">ERRO NA MATRIZ DE DADOS</h3>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Protocolo de comunicação interrompido por interferência externa.</p>
                <button 
                  onClick={() => mutate()} 
                  className="mt-6 px-8 py-2 bg-orange-500/10 border border-orange-500/40 text-[10px] font-black text-orange-400 uppercase tracking-widest hover:bg-orange-500 hover:text-black transition-all"
                  style={MILITARY_CLIP}
                >
                  Tentar Reconexão
                </button>
              </div>
            )}

            {!logs && !error && (
              <div className="space-y-1 p-6">
                 {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-orange-500/[0.03] border border-orange-500/5 mb-1" style={{ opacity: 1 - (i * 0.12) }}></div>
                 ))}
              </div>
            )}

            {logs && logs.length === 0 && (
              <div className="py-32 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em] italic mb-2">Nenhum rastro detectado no setor.</p>
                <p className="text-slate-700 font-mono text-[9px] uppercase tracking-widest">Aguardando instigação de rede...</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {logs?.map((log, index) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="group flex items-center gap-4 p-4 md:px-8 hover:bg-orange-500/[0.03] transition-all relative border-l-2 border-transparent hover:border-orange-500"
                >
                  <div className="absolute left-10 md:left-12 top-0 bottom-0 w-px bg-slate-800 group-first:top-1/2 group-last:bottom-1/2 opacity-30"></div>
                  
                  <div className="w-14 items-center flex shrink-0 md:w-24">
                     <span className="text-[10px] font-mono text-slate-500 font-bold group-hover:text-orange-400 transition-colors">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                     </span>
                  </div>

                  <div className="z-10 w-9 h-9 rounded-sm bg-black border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-orange-500/50 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all rotate-45">
                     <div className="-rotate-45">
                      <LogIcon type={log.action_type} metadata={log.metadata} />
                     </div>
                  </div>

                  <div className="flex-1 min-w-0 font-mono text-[11px] md:text-xs">
                     <LogContent log={log} />
                  </div>

                  <div className="hidden md:flex flex-col items-end">
                     <span className="text-[10px] font-black font-orbitron text-slate-700 uppercase group-hover:text-orange-500/40 transition-colors">
                        DATA_STAMP
                     </span>
                     <span className="text-[11px] font-mono text-slate-500/80 uppercase">
                        {format(new Date(log.created_at), "dd MMM", { locale: ptBR })}
                     </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Cooler Footer Area */}
          <div className="bg-black/60 p-6 flex flex-col items-center justify-center border-t border-slate-800 relative">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
            
            <div className="flex items-center gap-8 mb-4">
              <div className="w-12 h-px bg-slate-800"></div>
              <div className="px-4 py-1 border border-orange-500/20 bg-orange-500/5">
                <p className="text-[10px] font-black font-orbitron text-orange-500 uppercase tracking-[0.4em] animate-pulse">
                   Transmission Feed Active
                </p>
              </div>
              <div className="w-12 h-px bg-slate-800"></div>
            </div>

            <div className="flex gap-6 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
              <span>Total: {logs?.length || 0} Entradas</span>
              <span>●</span>
              <span>Integridade: 100%</span>
              <span>●</span>
              <span>Buffer: Seguro</span>
            </div>

            <div className="mt-4 flex gap-1">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`w-1 h-3 ${i < (logs?.length || 0) / 2.5 ? 'bg-orange-500/40' : 'bg-slate-800'} transition-colors`}></div>
              ))}
            </div>
            
            <div className="absolute bottom-2 right-4 text-[8px] font-mono text-slate-800 select-none">
              SPECTRO_AUDIT_PROTOCOL_v4.2
            </div>
          </div>
        </div>

        {/* Floating Decoration Bottom */}
        <div className="mt-8 flex justify-between items-center px-4 opacity-50">
          <div className="flex gap-4">
             <div className="w-8 h-1 bg-orange-500/30"></div>
             <div className="w-16 h-1 bg-slate-800"></div>
          </div>
          <div className="text-[10px] font-mono text-slate-500 tracking-[0.5em] uppercase">
             Monitor de Rede UrbanClash
          </div>
          <div className="flex gap-4">
             <div className="w-16 h-1 bg-slate-800"></div>
             <div className="w-8 h-1 bg-orange-500/30"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
