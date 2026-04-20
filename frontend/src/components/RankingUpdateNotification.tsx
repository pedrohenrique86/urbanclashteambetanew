import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, Bell } from "lucide-react";

interface RankingUpdateNotificationProps {
  lastUpdated: Date;
}

export default function RankingUpdateNotification({
  lastUpdated,
}: RankingUpdateNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(timer);
  }, [lastUpdated]);

  const roundedDate = new Date(lastUpdated);
  roundedDate.setMinutes(Math.floor(lastUpdated.getMinutes() / 10) * 10, 0, 0);

  const formattedTime = roundedDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="fixed top-[180px] sm:top-24 right-4 sm:right-8 z-[200] pointer-events-none"
        >
          {/* Tactical Container - Lighter Version */}
          <div className="relative group overflow-hidden">
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md border border-cyan-500/20 rounded-sm" />
            
            <div className="relative px-4 py-3 flex items-center gap-3">
              <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/5 rounded-sm border border-cyan-500/20" />
                <RefreshCcw className="w-4 h-4 text-cyan-400 animate-spin-slow" style={{ animationDuration: '6s' }} />
              </div>

              <div className="flex flex-col">
                <span className="text-[9px] font-orbitron font-black text-white/40 tracking-widest uppercase">
                  SYSTEM_SYNC
                </span>
                <p className="text-[10px] font-mono text-cyan-400/80 uppercase">
                  RANKING_ATUALIZADO: {formattedTime}
                </p>
              </div>

              <Bell className="w-3 h-3 text-cyan-500/30 ml-2" />
            </div>

            {/* Subtle Progress Bar */}
            <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500/20 w-full">
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
