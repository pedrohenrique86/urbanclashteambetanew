import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  Trash2, 
  Terminal, 
  Activity, 
  RefreshCw,
  Search,
  Database,
  User,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { apiClient } from "../lib/supabaseClient";
import { useUserProfile } from "../hooks/useUserProfile";
import { useToast } from "../contexts/ToastContext";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

interface AuditLog {
  id: string;
  userId: string;
  actionType: string;
  entityType?: string;
  entityId?: string;
  metadata: any;
  ipAddress?: string;
  createdAt: string;
}

export default function AdminPage() {
  const { userProfile } = useUserProfile();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);
  const [startId, setStartId] = useState("+");
  const [history, setHistory] = useState<string[]>([]); // Para navegação reversa simplificada

  const fetchLogs = async (cursor: string = "+") => {
    setIsLoading(true);
    try {
      const data = await apiClient.getAuditLogs(50, cursor);
      setLogs(data.logs || []);
    } catch (err) {
      showToast("Falha ao carregar logs de auditoria", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.is_admin) {
      fetchLogs();
    }
  }, [userProfile?.is_admin]);

  const handleNextPage = () => {
    if (logs.length > 0) {
      const lastId = logs[logs.length - 1].id;
      setHistory(prev => [...prev, startId]);
      setStartId(lastId);
      fetchLogs(lastId);
    }
  };

  const handlePrevPage = () => {
    if (history.length > 0) {
      const prevId = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setStartId(prevId);
      fetchLogs(prevId);
    }
  };

  const handleClearChats = async () => {
    if (!window.confirm("ATENÇÃO: Isso apagará TODOS os históricos de chat de todos os clãs e canais globais. Confirmar?")) return;
    
    setIsClearingChats(true);
    try {
      const res = await apiClient.clearChats();
      showToast(res.message, "success");
    } catch (err) {
      showToast("Falha ao limpar chats", "error");
    } finally {
      setIsClearingChats(false);
    }
  };

  if (!userProfile?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500 font-orbitron uppercase tracking-widest">
        [ ACESSO NEGADO: REQUER NÍVEL DE ADMINISTRAÇÃO ]
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 font-mono">
      {/* HEADER HUD */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-[10px] text-red-500 font-black tracking-[0.3em] uppercase">CENTRAL_DE_COMANDO_ADMIN</span>
          </div>
          <h1 className="text-3xl font-black text-white font-orbitron tracking-tight">AUDITORIA <span className="text-red-500">GLOBAL</span></h1>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleClearChats}
            disabled={isClearingChats}
            className="px-6 py-2 bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
            style={MILITARY_CLIP}
          >
            <Trash2 className="w-4 h-4" />
            {isClearingChats ? "LIMPANDO..." : "LIMPAR_TODOS_CHATS"}
          </button>
          
          <button
            onClick={() => fetchLogs(startId)}
            className="px-6 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
            style={MILITARY_CLIP}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            SYNC_LOGS
          </button>

          <a
            href={`${import.meta.env.VITE_API_URL}/admin/export-logs?token=${apiClient.getToken()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-blue-600/20 border border-blue-500/40 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
            style={MILITARY_CLIP}
            onClick={(e) => {
              // SÊNIOR: Como o browser não envia headers em links <a>, passamos o token na URL ou usamos blob.
              // Aqui usaremos o token na URL para simplicidade se o backend aceitar, 
              // mas nosso middleware authenticateToken geralmente olha o header Authorization.
              // Vou mudar para um fetch manual para garantir o Header.
              e.preventDefault();
              const downloadLogs = async () => {
                try {
                  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/export-logs`, {
                    headers: {
                      'Authorization': `Bearer ${apiClient.getToken()}`
                    }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit_logs_${new Date().getTime()}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  showToast("Erro ao baixar arquivo", "error");
                }
              };
              downloadLogs();
            }}
          >
            <Database className="w-4 h-4" />
            DOWNLOAD_TXT
          </a>
        </div>
      </header>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-black/40 border border-white/5 p-4 rounded-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 flex items-center justify-center rounded-sm">
               <Database className="w-5 h-5 text-red-400" />
            </div>
            <div>
               <p className="text-[8px] text-zinc-500 uppercase font-black">Capacidade Stream</p>
               <p className="text-lg font-orbitron text-white">200.000 <span className="text-[10px] text-zinc-400">LOGS</span></p>
            </div>
         </div>
         <div className="bg-black/40 border border-white/5 p-4 rounded-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center rounded-sm">
               <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
               <p className="text-[8px] text-zinc-500 uppercase font-black">Status de Auditoria</p>
               <p className="text-lg font-orbitron text-emerald-400">ATIVO <span className="text-[10px] text-zinc-400 font-mono tracking-normal ml-2 animate-pulse">● LIVE</span></p>
            </div>
         </div>
         <div className="bg-black/40 border border-white/5 p-4 rounded-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center rounded-sm">
               <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <div>
               <p className="text-[8px] text-zinc-500 uppercase font-black">Página Atual</p>
               <p className="text-lg font-orbitron text-white">{history.length + 1} <span className="text-[10px] text-zinc-400">OFFSET</span></p>
            </div>
         </div>
      </div>

      {/* LOGS TERMINAL */}
      <div className="bg-[#050505] border border-white/10 rounded-sm overflow-hidden flex flex-col min-h-[600px] shadow-2xl relative">
        <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-l border-white/10 pl-3">Rede_Audit_Stream_v4.0</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                <Search className="w-3 h-3" />
                <span>FILTER_OFF</span>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={handlePrevPage} disabled={history.length === 0} className="p-1 hover:bg-white/10 disabled:opacity-20 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={handleNextPage} disabled={logs.length < 50} className="p-1 hover:bg-white/10 disabled:opacity-20 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Timestamp</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Agente</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ação</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Entidade</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">IP_Address</th>
                <th className="p-3 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <AnimatePresence mode="popLayout">
                {logs.map((log) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-300 font-bold">{format(new Date(log.createdAt), "HH:mm:ss.SSS")}</span>
                        <span className="text-[8px] text-zinc-600">{format(new Date(log.createdAt), "dd/MM/yyyy")}</span>
                      </div>
                    </td>
                    <td className="p-3">
                       <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-zinc-500" />
                          <span className="text-[10px] text-blue-400 font-bold truncate max-w-[120px]">{log.userId}</span>
                       </div>
                    </td>
                    <td className="p-3">
                       <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase ${
                         log.actionType === 'combat' ? 'bg-red-500/20 text-red-400' :
                         log.actionType === 'training' ? 'bg-cyan-500/20 text-cyan-400' :
                         log.actionType === 'market' ? 'bg-emerald-500/20 text-emerald-400' :
                         'bg-zinc-800 text-zinc-400'
                       }`}>
                         {log.actionType}
                       </span>
                    </td>
                    <td className="p-3">
                       <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold">{log.entityType || '---'}</span>
                          <span className="text-[8px] text-zinc-600 truncate max-w-[100px]">{log.entityId || 'N/A'}</span>
                       </div>
                    </td>
                    <td className="p-3">
                       <span className="text-[10px] text-zinc-500 font-mono">{log.ipAddress || '0.0.0.0'}</span>
                    </td>
                    <td className="p-3 max-w-md">
                       <div className="text-[9px] text-zinc-400 font-mono truncate hover:whitespace-normal hover:bg-black p-1 transition-all cursor-help border border-transparent hover:border-white/10 rounded-sm">
                          {JSON.stringify(log.metadata)}
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {logs.length === 0 && !isLoading && (
            <div className="py-20 text-center flex flex-col items-center">
               <Clock className="w-8 h-8 text-zinc-800 mb-4" />
               <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">Aguardando atividades na rede...</p>
            </div>
          )}
        </div>

        {/* TERMINAL FOOTER */}
        <div className="bg-black p-2 border-t border-white/10 flex justify-between items-center px-4">
           <div className="flex items-center gap-4">
              <span className="text-[8px] text-zinc-700 uppercase font-black tracking-widest italic">UrbanClash_Defense_OS // v4.2.0</span>
              <div className="w-40 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
                 <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute top-0 bottom-0 w-20 bg-blue-500/20 shadow-[0_0_10px_blue]"></motion.div>
              </div>
           </div>
           <div className="text-[9px] text-zinc-500">
              BUFFER_LOADED: {(logs.length / 50 * 100).toFixed(1)}%
           </div>
        </div>
      </div>
    </div>
  );
}
