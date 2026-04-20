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
          initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
          className="fixed top-[180px] sm:top-20 left-1/2 z-[200] w-[90%] max-w-[400px] pointer-events-none"
        >
          {/* Tactical Container */}
          <div className="relative group">
            {/* Background with Blur and Texture */}
            <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
            
            {/* Top Tactical Bar */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            {/* Content Area */}
            <div className="relative px-5 py-4 flex items-center gap-4">
              {/* Icon Container */}
              <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/10 rounded-lg transform rotate-45 border border-cyan-500/30" />
                <RefreshCcw className="w-5 h-5 text-cyan-400 rotate-0 animate-spin-slow" style={{ animationDuration: '4s' }} />
              </div>

              {/* Text Info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-orbitron font-black text-cyan-500 tracking-widest uppercase">
                    SYSTEM_UPDATE
                  </span>
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                </div>
                <h3 className="text-sm font-exo text-white/90 leading-tight">
                  Status Global do Ranking Atualizado
                </h3>
                <p className="text-[11px] font-orbitron text-white/40 mt-1">
                  TIMESTAMP: <span className="text-white/60 font-black">{formattedTime}</span>
                </p>
              </div>

              {/* Bell Icon Decoration */}
              <div className="ml-auto opacity-20 group-hover:opacity-100 transition-opacity">
                <Bell className="w-4 h-4 text-cyan-500" />
              </div>
            </div>

            {/* Auto-Hide Progress Bar */}
            <div className="absolute bottom-0 left-0 h-[1.5px] bg-cyan-500">
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              />
            </div>

            {/* Corner Details */}
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-cyan-500/30 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-cyan-500/30 rounded-bl-lg" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
