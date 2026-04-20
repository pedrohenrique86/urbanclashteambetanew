import React from "react";
import { motion } from "framer-motion";
import { useUserProfileContext } from "../../contexts/UserProfileContext";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";

interface UnderConstructionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
}

export const UnderConstruction: React.FC<UnderConstructionProps> = ({ title, icon, description }) => {
  const { userProfile } = useUserProfileContext();
  
  const rawFaction = userProfile?.faction as any;
  const factionName = typeof rawFaction === 'string' ? rawFaction : (rawFaction?.name || 'gangsters');
    
  const factionKey = String(factionName).toLowerCase().trim();
  const canonicalFaction = FACTION_ALIAS_MAP_FRONTEND[factionKey] || 'gangsters';
  const isGangster = canonicalFaction === "gangsters";

  const theme = isGangster 
    ? {
        color: "orange",
        text: "text-orange-400",
        bg: "from-orange-500/20 to-red-500/20",
        glow: "drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
        gradient: "from-orange-400 to-red-400",
        accent: "bg-orange-500",
        light: "bg-orange-500/10"
      }
    : {
        color: "blue",
        text: "text-blue-400",
        bg: "from-blue-500/20 to-purple-500/20",
        glow: "drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        gradient: "from-blue-400 to-cyan-400",
        accent: "bg-blue-500",
        light: "bg-blue-500/10"
      };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        style={{
          boxShadow: "0 0 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className={`absolute -top-24 -left-24 w-40 h-40 ${theme.light} blur-[80px] rounded-full`} />
        <div className={`absolute -bottom-24 -right-24 w-40 h-40 ${theme.light} blur-[80px] rounded-full`} />

        <div className="relative z-10 text-center space-y-4">
          <motion.div
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${theme.bg} border border-white/10 mb-0`}
          >
            {React.cloneElement(icon as React.ReactElement, { 
              className: `w-7 h-7 ${theme.text} ${theme.glow}` 
            })}
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-xl md:text-2xl font-bold font-orbitron tracking-tight text-white mb-2">
              {title.split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1 ? (
                    <span className={`text-transparent bg-gradient-to-r ${theme.gradient} bg-clip-text`}>
                      {word}
                    </span>
                  ) : (
                    word + ' '
                  )}
                </span>
              ))}
            </h1>
            <div className={`w-12 h-1 bg-gradient-to-r ${isGangster ? 'from-orange-500' : 'from-blue-500'} to-transparent mx-auto rounded-full mb-3`} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-300 text-sm md:text-base font-light leading-relaxed max-w-xs mx-auto"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em]">
              <span className={`w-1 h-1 rounded-full ${theme.accent} animate-pulse`} />
              Sistemas em Desenvolvimento
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
