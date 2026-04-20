import React, { useState } from "react";
import { motion } from "framer-motion";
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

  React.useEffect(() => {
    if (lastUpdated) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 5000);
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
    code: "CL-TOP-05",
    gradient: "from-purple-500 via-purple-400 to-purple-600",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.1)]",
    borderColor: "border-purple-500/20",
    data: (clans || []).slice(0, 5),
    type: "clans" as const,
  };

  const rankingConfigs = [gangsterConfig, guardConfig, clanConfig];

  return (
    <section id="rankings" className="py-32 px-6 bg-black relative overflow-hidden">
      {/* HUD Background Decorations */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      
      {showNotification && lastUpdated && (
        <RankingUpdateNotification lastUpdated={lastUpdated} />
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-4 py-1 border border-white/10 rounded-full mb-6 bg-white/5"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-orbitron font-bold tracking-[0.3em] text-gray-400">LEADERBOARD_SYSTEM_LIVE</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-orbitron font-black tracking-tighter text-white mb-4"
          >
            QUADRO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">HONRA</span>
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

        <div className="grid lg:grid-cols-3 gap-8">
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
                            <PlayerRankingItem player={item} bgColor="bg-white/[0.03] group-hover:bg-white/[0.08]" />
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
    </section>
  );
}
