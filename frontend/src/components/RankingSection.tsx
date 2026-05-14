import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tooltip } from "react-tooltip";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";
import PlayerRankingItem from "./PlayerRankingItem";
import ClanRankingItem from "./ClanRankingItem";
import RankingUpdateNotification from "./RankingUpdateNotification";
import {
  getPositionDisplay,
  getPositionSizeClass,
  getPositionTextColor,
} from "../utils/rankingUtils";

export default function RankingSection() {
  const isPlayer = (item: any): item is Player => {
    return (
      item &&
      typeof item.username === "string" &&
      typeof item.level === "number"
    );
  };

  const isClan = (item: any): item is Clan => {
    return (
      item && typeof item.name === "string" && typeof item.score === "number"
    );
  };

  const { data, loading, error, lastUpdated } = useRankingCache();
  const [showNotification, setShowNotification] = useState(false);
  const { gangsters, guardas, clans } = data;
  const isFirstMount = React.useRef(true);

  React.useEffect(() => {
    if (lastUpdated) {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  const gangsterConfig = {
    title: "OPERATIVOS RENEGADOS",
    code: "RN-TOP-05",
    gradient: "from-orange-500 via-orange-400 to-orange-600",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.1)]",
    borderColor: "border-orange-500/20",
    data: (gangsters || []).slice(0, 5),
    type: "gangsters" as const,
  };

  const guardConfig = {
    title: "UNIDADES GUARDIÕES",
    code: "GD-TOP-05",
    gradient: "from-blue-500 via-blue-400 to-blue-600",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]",
    borderColor: "border-blue-500/20",
    data: (guardas || []).slice(0, 5),
    type: "guardas" as const,
  };

  const clanConfig = {
    title: "DIVISÕES DE ELITE",
    code: "DV-TOP-05",
    gradient: "from-purple-500 via-purple-400 to-purple-600",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.1)]",
    borderColor: "border-purple-500/20",
    data: (clans || []).slice(0, 5),
    type: "clans" as const,
  };

  const rankingConfigs = [gangsterConfig, guardConfig, clanConfig];

  return (
    <section id="rankings" className="py-24 sm:py-32 px-4 sm:px-6 bg-[#020205] relative overflow-hidden">
      {/* Background Cinematic Atmosphere - Multi-layered */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-purple-600/[0.02] blur-[150px] rounded-full pointer-events-none" />
      </div>

      {/* Hex Grid Texture */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%23ffffff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
             backgroundSize: '80px 80px'
           }} />
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] z-0 pointer-events-none bg-[length:100%_4px,3px_100%]" />

      {/* HUD Background Decorations */}
      {showNotification && lastUpdated && (
        <RankingUpdateNotification lastUpdated={lastUpdated} />
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-4 py-1.5 border border-white/10 rounded-full mb-8 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] sm:text-[11px] font-orbitron font-bold tracking-[0.4em] text-gray-300">LEADERBOARD_SYSTEM_LIVE</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-7xl font-orbitron font-black tracking-tighter text-white mb-6 uppercase"
          >
            QUADRO DE <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">HONRA</span>
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest"
          >
            <span>Sync: 10m Interval</span>
            <div className="w-1 h-1 bg-gray-800 rounded-full" />
            <span>Last_Update: {lastUpdated ? lastUpdated.toLocaleTimeString("pt-BR") : "---"}</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rankingConfigs.map((config, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-zinc-950/40 border-t-2 ${config.borderColor} p-6 pt-10 ${config.glow} transition-all duration-500`}
            >
              {/* Card Header */}
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-black px-4 py-1 border border-white/10">
                <span className="text-[10px] font-mono text-gray-500 tracking-tighter">{config.code}</span>
              </div>

              <h3 className={`text-xl font-orbitron font-black mb-8 text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${config.gradient}`}>
                {config.title}
              </h3>

              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 animate-pulse border border-white/5 rounded" />
                  ))
                ) : (
                  Array.from({ length: 5 }).map((_, i) => {
                    const item = config.data[i];
                    if (item) {
                      return (
                        <div key={item.id} className="group transition-all duration-300">
                          {isPlayer(item) ? (
                            <PlayerRankingItem player={item} forceFaction={config.type} bgColor="bg-white/[0.03] group-hover:bg-white/[0.08]" />
                          ) : isClan(item) ? (
                            <ClanRankingItem clan={item} bgColor="bg-white/[0.03] group-hover:bg-white/[0.08]" />
                          ) : null}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={i} className="h-14 bg-white/[0.01] border border-white/5 flex items-center px-4 rounded opacity-20">
                        <span className="text-xs font-mono text-gray-800">EMPTY_SLOT_{i+1}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Decorative HUD Details */}
              <div className="mt-8 flex justify-between items-center opacity-20">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-white" />
                  <div className="w-1 h-3 bg-white" />
                  <div className="w-4 h-3 bg-white" />
                </div>
                <div className="text-[8px] font-mono text-white">SECURE_TRANS_VERIFIED</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <Tooltip 
        id="ranking-xp-tooltip" 
        place="top" 
        className="!bg-black/90 !backdrop-blur-xl !text-white !rounded-xl !px-4 !py-2 !text-[10px] !border !border-white/10 !shadow-2xl font-orbitron uppercase tracking-widest"
        style={{ zIndex: 9999 }}
      />
    </section>
  );
}
