import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  ExclamationTriangleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { getRarityColor } from "../utils/rarity";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  show: boolean;
  onClose: () => void;
}

/**
 * TACTICAL TOAST SYSTEM - UrbanClash Team Reference Design
 * Glossy, transparent, and high-performance notifications.
 * Standardized position: Top Right (Responsive)
 */

const MILITARY_CLIP = { 
  clipPath: "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)" 
};

export default function Toast({
  message,
  type,
  duration = 3000,
  show,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const config = {
    success: {
       headerBg: "bg-cyan-500/10",
       headerText: "text-cyan-400",
       border: "border-cyan-500/30",
       glow: "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
       iconBg: "bg-cyan-500/10",
       iconBorder: "border-cyan-500/20",
       bar: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]",
       label: "SYSTEM_SUCCESS",
       icon: <CheckCircleIcon className="w-5 h-5 text-cyan-400" />
    },
    error: {
       headerBg: "bg-rose-500/10",
       headerText: "text-rose-400",
       border: "border-rose-500/30",
       glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
       iconBg: "bg-rose-500/10",
       iconBorder: "border-rose-500/20",
       bar: "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
       label: "SYSTEM_FATAL",
       icon: <ExclamationCircleIcon className="w-5 h-5 text-rose-400" />
    },
    warning: {
       headerBg: "bg-amber-500/10",
       headerText: "text-amber-400",
       border: "border-amber-500/30",
       glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
       iconBg: "bg-amber-500/10",
       iconBorder: "border-amber-500/20",
       bar: "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
       label: "SYSTEM_WARN",
       icon: <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
    },
    info: {
       headerBg: "bg-violet-500/10",
       headerText: "text-violet-400",
       border: "border-violet-500/30",
       glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
       iconBg: "bg-violet-500/10",
       iconBorder: "border-violet-500/20",
       bar: "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]",
       label: "SYSTEM_INFO",
       icon: <InformationCircleIcon className="w-5 h-5 text-violet-400" />
    },
  };

  const { headerBg, headerText, border, glow, iconBg, iconBorder, bar, label, icon } = config[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed top-6 md:top-12 right-4 md:right-8 z-[99999] w-auto min-w-[200px] max-w-[280px] pointer-events-auto shadow-2xl"
        >
          <div
            className={`relative bg-slate-950/80 backdrop-blur-3xl border ${border} ${glow} overflow-hidden`}
            style={MILITARY_CLIP}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none"></div>
            
            {/* Header Label (More Compact) */}
            <div className={`text-[9px] font-exo font-black tracking-widest px-3 py-1 ${headerBg} border-b border-white/5 ${headerText} flex justify-between items-center`}>
              <span className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${bar} animate-pulse`}></div>
                {label}
              </span>
              <button 
                onClick={onClose} 
                className="hover:text-white transition-colors p-0.5"
                aria-label="Close notification"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>

            <div className="p-2.5 flex gap-3 items-center">
              <div className={`flex-shrink-0 p-1.5 ${iconBg} ${iconBorder} border shadow-inner`}>
                {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
              </div>
                <div className="flex-1 min-w-0 pr-1">
                  {message.split('\n').map((line, idx) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return null;

                    const upperLine = trimmedLine.toUpperCase();
                    const isFaction = ["RENEGADOS", "GUARDIOES", "GANGSTERS", "GUARDAS", "CITIZEN", "BOT"].some(f => upperLine.includes(f));
                    
                    if (isFaction || (idx === 0 && trimmedLine.length < 15 && !trimmedLine.includes(' '))) {
                       return null;
                    }

                    const parseMessage = (text: string) => {
                      const parts = text.split(/(§[^§]+§)/g);
                      return parts.map((part, i) => {
                        if (part.startsWith('§') && part.endsWith('§')) {
                          const inner = part.slice(1, -1);
                          const [rarity, content] = inner.split(':');
                          return (
                            <span key={i} className={getRarityColor(rarity)}>
                              {content}
                            </span>
                          );
                        }
                        return part;
                      });
                    };

                    return (
                      <p key={idx} className={`leading-tight break-words font-exo font-bold uppercase tracking-tight ${
                        idx === 0 || !message.includes('\n') ? 'text-[11px] text-white mb-0.5' : 'text-[9px] text-slate-400'
                      }`}>
                        {parseMessage(trimmedLine)}
                      </p>
                    );
                  })}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-[2px] w-full bg-white/5 overflow-hidden">
               <motion.div 
                 initial={{ width: "100%" }}
                 animate={{ width: "0%" }}
                 transition={{ duration: duration / 1000, ease: "linear" }}
                 className={`h-full ${bar}`}
               />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
