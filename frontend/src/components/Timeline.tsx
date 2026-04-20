import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Swords, 
  BookOpen, 
  Trophy, 
  Wallet,
  Target
} from "lucide-react";

interface TimelineProps {
  className?: string;
  isVisible: boolean;
  onGoToStart: () => void;
}

const timelineData = [
  {
    section: "Facções",
    title: "Escolha Sua Facção",
    description: "Renegados, Guardiões ou Divisões",
    icon: <Swords size={18} />,
    color: "from-blue-500 to-cyan-500",
    glow: "shadow-cyan-500/50",
    id: "factions",
  },
  {
    section: "Sobre",
    title: "Sobre o Jogo",
    description: "Regras e mecânicas",
    icon: <BookOpen size={18} />,
    color: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/50",
    id: "about",
  },
  {
    section: "Rankings",
    title: "Classificações",
    description: "Os melhores jogadores",
    icon: <Trophy size={18} />,
    color: "from-orange-500 to-amber-500",
    glow: "shadow-orange-500/50",
    id: "rankings",
  },
  {
    section: "Premiação",
    title: "Prêmios",
    description: "Valores em dinheiro",
    icon: <Wallet size={18} />,
    color: "from-green-500 to-emerald-500",
    glow: "shadow-green-500/50",
    id: "prizes",
  },
];

const Timeline: React.FC<TimelineProps> = ({
  className = "",
  isVisible,
  onGoToStart,
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsIdle(false);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 1200);
  };

  useEffect(() => {
    const handleMouseMove = () => resetIdleTimer();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleMouseMove);
    resetIdleTimer();
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = timelineData.map((item) => document.getElementById(item.id));
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      setIsAtTop(window.scrollY < 400);

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(i);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const hudClip = "polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)";

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ 
              opacity: (isIdle && !isAtTop) ? 0 : 1, 
              x: (isIdle && !isAtTop) ? 50 : 0 
            }}
            whileHover={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto mr-4 hidden lg:block ${className}`}
          >
            {/* Main HUD Frame */}
            <div className="relative group/hud bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl overflow-hidden">
              
              {/* Technical Detailing - Corners */}
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-orange-500/40 rounded-tr-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orange-500/40 rounded-br-lg" />
              
              <div className="space-y-4 relative z-10">
                {/* START / HOME NODE */}
                {!isAtTop && (
                  <motion.div
                    className="relative cursor-pointer flex items-center group"
                    onClick={onGoToStart}
                    whileHover={{ x: -2 }}
                  >
                    <div 
                      className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:border-orange-500/50 group-hover:bg-orange-500/10"
                      style={{ clipPath: hudClip }}
                    >
                      <Home size={18} className="text-gray-400 group-hover:text-orange-500" />
                    </div>
                    <span className="ml-3 font-orbitron text-[10px] font-black tracking-[0.2em] text-gray-500 group-hover:text-orange-400 uppercase">
                      INÍCIO
                    </span>
                    {/* Segmented Connector */}
                    <div className="absolute left-5 top-10 w-0.5 h-4 bg-gradient-to-b from-orange-500/20 to-transparent -translate-x-1/2" />
                  </motion.div>
                )}

                {/* TIMELINE NODES */}
                {timelineData.map((event, index) => {
                  const isActive = index === activeSection;
                  return (
                    <motion.div
                      key={index}
                      className="relative cursor-pointer flex items-center group/node"
                      onClick={() => scrollToSection(event.id)}
                      whileHover={{ x: -2 }}
                    >
                      {/* Armored Tactical Node */}
                      <div className="relative">
                        <div 
                          className={`w-11 h-11 flex items-center justify-center transition-all duration-500 relative z-10 ${
                            isActive 
                              ? `bg-gradient-to-br ${event.color} text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] border-white/30`
                              : "bg-zinc-900/80 border border-white/5 text-gray-400 group-hover/node:border-white/20"
                          }`}
                          style={{ clipPath: hudClip, borderWidth: isActive ? '1px' : '0' }}
                        >
                          {event.icon}
                        </div>
                        
                        {/* Active Scanline Pulse */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 z-0 bg-white/20"
                            style={{ clipPath: hudClip }}
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>

                      {/* Tactical HUD Label */}
                      <div className="ml-4 flex flex-col items-start translate-y-[-1px]">
                        <span className={`font-orbitron text-[10px] font-black tracking-[0.2em] transition-all duration-300 ${
                          isActive 
                            ? "text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                            : "text-gray-500 group-hover/node:text-gray-300"
                        }`}>
                          {event.section.toUpperCase()}
                        </span>
                        {isActive && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            className="h-[1px] bg-gradient-to-r from-white/40 to-transparent mt-0.5"
                          />
                        )}
                      </div>

                      {/* Circuit Connector Line */}
                      {index < timelineData.length - 1 && (
                        <div className="absolute left-[21px] top-11 w-[2px] h-4 -translate-x-1/2 overflow-hidden">
                          <div className={`w-full h-full ${
                            isActive 
                              ? "bg-gradient-to-b from-white/40 to-white/10" 
                              : "bg-white/5"
                          }`} />
                          {isActive && (
                            <motion.div 
                              className="absolute top-0 left-0 w-full h-[30%] bg-white shadow-[0_0_8px_white]"
                              animate={{ top: ["0%", "100%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* HUD Background Details */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timeline;
