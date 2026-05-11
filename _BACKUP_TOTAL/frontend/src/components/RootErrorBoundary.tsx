import React from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle, Cpu } from "lucide-react";

const MILITARY_CLIP = {
  clipPath:
    "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)",
};

export default function RootErrorBoundary() {
  const error = useRouteError();
  
  // Identifica se é o erro de "Failed to fetch dynamically imported module"
  const isChunkError = 
    error instanceof TypeError && 
    (error.message.includes("Failed to fetch dynamically imported module") ||
     error.message.includes("Importing a module script failed"));

  const handleReload = () => {
    window.location.reload();
  };

  // SÊNIOR: Tenta recuperar automaticamente do erro de carregamento (comum no 4G)
  React.useEffect(() => {
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      
      // Só tenta o reload automático se não tiver recarregado nos últimos 10 segundos
      if (!lastReload || (now - parseInt(lastReload)) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        console.warn("🔄 Falha de carregamento no 4G. Tentando recuperação automática...");
        handleReload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-6 font-sans selection:bg-red-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div 
          className="bg-black/60 border-2 border-red-500/30 p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden"
          style={MILITARY_CLIP}
        >
          {/* Top Bar Label */}
          <div className="absolute top-0 left-0 bg-red-500 px-3 py-1">
             <span className="text-[10px] font-black text-black uppercase tracking-tighter">System_Alert</span>
          </div>

          <div className="flex flex-col items-center text-center mt-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              {isChunkError ? (
                <Cpu className="w-8 h-8 text-red-500 animate-pulse" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
              )}
            </div>

            <h1 className="text-2xl font-orbitron font-black text-white mb-2 uppercase tracking-tight">
              FALHA NA INTERFACE
            </h1>
            
            <p className="text-zinc-400 font-medium text-sm leading-relaxed mb-8 uppercase tracking-widest">
              A conexão com os módulos centrais sofreu uma instabilidade temporária. Recarregue a interface para restabelecer o link.
            </p>
 
            <button
              onClick={() => window.location.reload()}
              className="w-full group relative flex items-center justify-center gap-3 py-4 bg-zinc-800 hover:bg-zinc-700 transition-all text-white font-black font-orbitron text-xs tracking-[0.3em] uppercase overflow-hidden"
              style={MILITARY_CLIP}
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span>Recarregar Sistema</span>
              
              {/* Button Shine Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>

            <div className="mt-8 flex flex-col items-center gap-1 opacity-20">
               <span className="text-[8px] font-mono text-white tracking-[0.5em] uppercase">Error_Code: {isChunkError ? 'MODULE_VER_MISMATCH' : (isRouteErrorResponse(error) ? error.status : 'UNKNOWN_EXCEPTION')}</span>
               <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full bg-red-500" 
                  />
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
