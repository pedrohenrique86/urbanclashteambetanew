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
      const isWin = meta.outcome?.startsWith('win');
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={isWin ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {isWin ? "VITÓRIA" : "DERROTA"} NO PROTOCOLO DE ACERTO DE CONTAS
            </span>
            <span className="text-slate-500 text-[10px]">vs {meta.target_name || "Desconhecido"}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] items-center">
            {meta.xp_gain > 0 && <span className="text-emerald-400/80">+{meta.xp_gain} XP</span>}
            {meta.xp_gain < 0 && <span className="text-rose-400/80">{meta.xp_gain} XP</span>}
            {meta.money_gain > 0 && <span className="text-yellow-400/80">+${meta.money_gain}</span>}
            {meta.money_loss > 0 && <span className="text-rose-400/80">-${meta.money_loss}</span>}
            {meta.is_rare && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-500 border border-red-500/30 rounded-sm font-black tracking-tighter">ALVO_HVT</span>}
          </div>
        </div>
      );
    }

    case 'training':
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
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
  const { data: logs, error, mutate, isValidating } = useSWR("/logs/me", logService.getMyLogs, {
    refreshInterval: 30000, // Sync a cada 30s
    revalidateOnFocus: true
  });

  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
  const factionKey = String(factionName).toLowerCase().trim();
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionKey] || 'gangsters';
  
  const theme = canonicalFaction === "gangsters" 
    ? { primary: "text-orange-400", border: "border-orange-500/20", glow: "shadow-[0_0_15px_rgba(249,115,22,0.1)]", accent: "from-orange-500/20 to-transparent" }
    : { primary: "text-blue-400", border: "border-blue-500/20", glow: "shadow-[0_0_15px_rgba(59,130,246,0.1)]", accent: "from-blue-500/20 to-transparent" };

  return (
    <div className="min-h-[80vh] p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <header className="max-w-5xl mx-auto mb-10 relative">
        <div className={`absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-current ${theme.primary} shadow-lg`}></div>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl md:text-5xl font-orbitron font-black tracking-widest text-white uppercase flex items-center gap-3">
              Network <span className={theme.primary}>Logs</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-mono mt-1 tracking-[0.3em] uppercase">
              Terminal de Auditoria de Redes e Histórico de Unidade
            </p>
          </motion.div>
          
          <button 
            onClick={() => mutate()}
            disabled={isValidating}
            className={`p-3 bg-black/40 border border-slate-800 rounded-xl hover:border-slate-600 transition-all active:scale-95 group ${isValidating ? 'animate-pulse' : ''}`}
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-white transition-colors ${isValidating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto">
        <div className="bg-black/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden" style={MILITARY_CLIP}>
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10 p-4 border-b border-slate-800/80 flex items-center justify-between bg-white/5">
             <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Sequência de Atividade Recente</span>
             </div>
             <span className="text-[9px] font-mono text-slate-600">UNIDADE_{userProfile?.id?.slice(0,8).toUpperCase()}</span>
          </div>

          <div className="divide-y divide-slate-800/50">
            {error && (
              <div className="p-12 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
                <p className="text-slate-400 font-mono text-sm">Falha ao descriptografar logs da rede.</p>
                <button onClick={() => mutate()} className="mt-4 px-6 py-2 bg-slate-900 border border-slate-800 text-[10px] font-bold text-white uppercase">Tentar Reconexão</button>
              </div>
            )}

            {!logs && !error && (
              <div className="space-y-1 p-6">
                 {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-white/[0.02] border border-white/[0.05]" style={{ opacity: 1 - (i * 0.15) }}></div>
                 ))}
              </div>
            )}

            {logs && logs.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center">
                <Sparkles className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest italic">Nenhum rastro detectado na rede... comece a se mover.</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {logs?.map((log, index) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center gap-4 p-4 md:px-6 hover:bg-white/[0.03] transition-colors relative"
                >
                  {/* Timeline Line */}
                  <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-slate-800 group-first:top-1/2 group-last:bottom-1/2"></div>
                  
                  {/* Timestamp Sidebar */}
                  <div className="w-14 items-center flex shrink-0 md:w-20">
                     <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                     </span>
                  </div>

                  {/* Dot Icon */}
                  <div className="z-10 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-slate-500 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-all">
                     <LogIcon type={log.action_type} metadata={log.metadata} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 font-mono text-[11px] md:text-xs">
                     <LogContent log={log} />
                  </div>

                  {/* Date Badge (Only for first log of each day maybe? Let's just show time for now and date if its older) */}
                  <div className="hidden md:block">
                     <span className="text-[9px] font-mono text-slate-600 uppercase">
                        {format(new Date(log.created_at), "dd MMM", { locale: ptBR })}
                     </span>
                  </div>

                  {/* Arrow Decoration */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="bg-white/5 p-3 flex items-center justify-center border-t border-slate-800/80">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
              [ FIM DA TRANSMISSÃO - TOTAL: {logs?.length || 0} REGISTROS ]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
