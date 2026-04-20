import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TimelineProps {
  className?: string;
  isVisible: boolean;
  onGoToStart: () => void;
}

const timelineData = [
  {
    section: "Facções",
    title: "Escolha Sua Facção",
    description:
      "Renegados, Guardiões ou Divisões - cada um com suas características",
    icon: "⚔️",
    color: "from-blue-500 to-cyan-500",
    id: "factions",
  },
  {
    section: "Sobre",
    title: "Sobre o Jogo",
    description: "Conheça as regras e mecânicas do Urban Clash Team",
    icon: "📖",
    color: "from-purple-500 to-pink-500",
    id: "about",
  },
  {
    section: "Rankings",
    title: "Classificações",
    description: "Veja os melhores jogadores de cada facção",
    icon: "🏆",
    color: "from-yellow-500 to-orange-500",
    id: "rankings",
  },
  {
    section: "Premiação",
    title: "Prêmios",
    description: "Valores em dinheiro para os primeiros colocados",
    icon: "💰",
    color: "from-green-500 to-emerald-500",
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
    
    // Inicia timer de 1s para esconder apenas se NÃO estiver no topo
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 1000);
  };

  useEffect(() => {
    const handleMouseMove = () => {
      resetIdleTimer();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleMouseMove);
    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Efeito para atualizar a seção ativa durante a rolagem
  useEffect(() => {
    const handleScroll = () => {
      const sections = timelineData.map((item) =>
        document.getElementById(item.id),
      );
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      setIsAtTop(window.scrollY < 400);

      // Update active section
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(i);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-end z-40 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ 
              opacity: (isIdle && !isAtTop) ? 0 : 0.85, 
              x: (isIdle && !isAtTop) ? 40 : 0 
            }}
            whileHover={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`pointer-events-auto mr-1 hidden lg:block ${className}`}
          >
            <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-md border border-gray-500/30 rounded-2xl p-3 sm:p-3 md:p-4 shadow-2xl shadow-purple-500/20">
              <div className="space-y-3 sm:space-y-3 md:space-y-4">
                {/* Botão para voltar ao início - Oculto quando já está no topo */}
                {!isAtTop && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0, duration: 0.3 }}
                    className="relative cursor-pointer group flex items-center"
                    onClick={onGoToStart}
                    title="Voltar ao Início"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className={`w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-base sm:text-base md:text-lg lg:text-lg transition-all duration-500 relative bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 hover:from-gray-600 hover:to-gray-500`}
                    >
                      {"🏠"}
                    </motion.div>
                    <motion.div
                      className={`ml-2 sm:ml-2 md:ml-3 text-xs sm:text-xs md:text-sm font-medium transition-all duration-300 opacity-100 whitespace-nowrap text-purple-300`}
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                    >
                      {"Início"}
                    </motion.div>
                    <div
                      className={`absolute left-5 top-10 w-0.5 h-4 transform -translate-x-1/2 transition-all duration-500 bg-gradient-to-b from-gray-600 to-gray-700`}
                    ></div>
                  </motion.div>
                )}

                {timelineData.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="relative cursor-pointer group flex items-center"
                    onClick={() => scrollToSection(event.id)}
                    title={event.title}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Modern dot indicator with glow effect */}
                    <motion.div
                      className={`w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-base sm:text-base md:text-lg lg:text-lg transition-all duration-500 relative ${
                        index === activeSection
                          ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/50"
                          : "bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 hover:from-gray-600 hover:to-gray-500"
                      }`}
                      animate={
                        index === activeSection
                          ? {
                              boxShadow: [
                                "0 0 20px rgba(168, 85, 247, 0.5)",
                                "0 0 30px rgba(168, 85, 247, 0.8)",
                                "0 0 20px rgba(168, 85, 247, 0.5)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {event.icon}
                      {index === activeSection && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-blue-500/30"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>

                    {/* Enhanced text label with gradient */}
                    <motion.div
                      className={`ml-2 sm:ml-2 md:ml-3 text-xs sm:text-xs md:text-sm font-medium transition-all duration-300 opacity-100 whitespace-nowrap ${
                        index === activeSection
                          ? "text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold"
                          : "text-purple-300"
                      }`}
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                    >
                      {event.section}
                    </motion.div>

                    {/* Modern connection line with gradient */}
                    {index < timelineData.length - 1 && (
                      <div
                        className={`absolute left-5 top-10 w-0.5 h-4 transform -translate-x-1/2 transition-all duration-500 ${
                          index === activeSection
                            ? "bg-gradient-to-b from-purple-400 to-blue-400 shadow-sm shadow-purple-400/50"
                            : "bg-gradient-to-b from-gray-600 to-gray-700"
                        }`}
                      ></div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timeline;
