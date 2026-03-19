import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TimelineProps {
  className?: string;
}

const timelineData = [
  {
    section: "Início",
    title: "Bem-vindo ao Urban Clash Team",
    description: "Apresentação do evento e informações gerais",
    icon: "🏠",
    color: "from-orange-500 to-red-500",
    id: "hero",
  },
  {
    section: "Facções",
    title: "Escolha Sua Facção",
    description:
      "Gangsters, Guardas ou Clãs - cada um com suas características",
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

const Timeline: React.FC<TimelineProps> = ({ className = "" }) => {
  const [activeSection, setActiveSection] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Iniciar como visível
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Efeito para controlar a visibilidade com base na atividade do mouse
  useEffect(() => {
    const handleMouseMove = () => {
      // Mostrar o timeline quando o mouse se move
      setIsVisible(true);

      // Limpar o timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Configurar um novo timeout para ocultar o timeline após 3 segundos
      // Mas apenas se não estiver no topo da página
      if (window.scrollY > 100) {
        // Só esconde se não estiver no topo
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 3000); // 3 segundos
      }
    };

    // Adicionar listener para movimento do mouse
    window.addEventListener("mousemove", handleMouseMove);

    // Limpar o listener e o timeout quando o componente for desmontado
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Efeito para atualizar a seção ativa durante a rolagem e controlar a visibilidade
  useEffect(() => {
    const handleScroll = () => {
      const sections = timelineData.map((item) =>
        document.getElementById(item.id),
      );
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      // Mostrar o timeline quando o usuário faz scroll
      setIsVisible(true);

      // Limpar o timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Configurar um novo timeout para ocultar o timeline após 3 segundos
      // Mas apenas se não estiver no topo da página
      if (window.scrollY > 100) {
        // Só esconde se não estiver no topo
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 3000); // 3 segundos
      }

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`fixed sm:right-4 md:right-6 lg:right-8 top-1/2 transform -translate-y-1/2 z-40 hidden sm:block ${className}`}
        >
          <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-md border border-gray-500/30 rounded-2xl p-3 sm:p-3 md:p-4 shadow-2xl shadow-purple-500/20">
            <div className="space-y-3 sm:space-y-3 md:space-y-4">
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
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
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
  );
};

export default Timeline;
