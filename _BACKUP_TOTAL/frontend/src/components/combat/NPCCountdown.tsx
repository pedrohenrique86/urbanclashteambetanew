import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface NPCCountdownProps {
  expiresAt: string;
  onExpire?: () => void;
}

export default function NPCCountdown({ expiresAt, onExpire }: NPCCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTime());

    const timer = setInterval(() => {
      const remaining = calculateTime();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (timeLeft <= 0) return null;

  const isCritical = timeLeft <= 10;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`font-mono text-[10px] font-black tracking-widest px-2 py-0.5 mt-2 rounded border ${
        isCritical 
          ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse scale-110" 
          : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
      }`}
    >
      <span className={isCritical ? "glitch-text" : ""}>
        {isCritical ? "⚠️ CRITICAL_WINDOW: " : "HVT_SCAN: "} {timeLeft}s
      </span>
      
      {isCritical && (
        <style dangerouslySetInnerHTML={{ __html: `
          .glitch-text {
            text-shadow: 2px 0 red, -2px 0 cyan;
            animation: glitch 0.3s infinite;
          }
          @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
          }
        `}} />
      )}
    </motion.div>
  );
}
