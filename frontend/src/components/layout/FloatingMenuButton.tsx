import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronRight
} from "lucide-react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { navItems } from "./DashboardSidebar"; // Importando os itens do menu

const MENU_WIDTH = 240;
const MENU_HEIGHT_ESTIMATE = 400; // Estimativa da altura do menu
const BUTTON_SIZE = 64;
const SCREEN_PADDING = 16;

export const FloatingMenuButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogout } = useUserProfile();

  // Sincroniza o menu aberto com a rota atual
  useEffect(() => {
    const activeCategory = navItems.find(category => 
      category.subItems?.some(item => location.pathname.startsWith(item.path))
    );
    if (activeCategory) {
      setOpenMenu(activeCategory.name);
    }
  }, [location.pathname]);


  // Atualiza o tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Chama na montagem
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carrega a posição salva ou define uma inicial segura
  useEffect(() => {
    if (windowSize.width === 0) return; // Aguarda o tamanho da janela ser definido

    const savedPos = localStorage.getItem("floating_menu_position");
    let initialPos;
    if (savedPos) {
      try {
        initialPos = JSON.parse(savedPos);
      } catch (e) {
        initialPos = { x: windowSize.width - BUTTON_SIZE - SCREEN_PADDING, y: windowSize.height / 2 };
      }
    } else {
      initialPos = { x: windowSize.width - BUTTON_SIZE - SCREEN_PADDING, y: windowSize.height / 2 };
    }
    
    // Garante que a posição inicial esteja dentro dos limites
    setPosition({
      x: Math.max(SCREEN_PADDING, Math.min(initialPos.x, windowSize.width - BUTTON_SIZE - SCREEN_PADDING)),
      y: Math.max(SCREEN_PADDING, Math.min(initialPos.y, windowSize.height - BUTTON_SIZE - SCREEN_PADDING)),
    });

  }, [windowSize]);

  const savePosition = (event: any, info: any) => {
    const newPos = { x: info.point.x, y: info.point.y };
    setPosition(newPos);
    localStorage.setItem("floating_menu_position", JSON.stringify(newPos));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleMenuToggle = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };


  // Lógica para calcular a posição do menu de forma inteligente
  const menuPosition = useMemo(() => {
    if (!isOpen || windowSize.width === 0) return { x: position.x, y: position.y, opacity: 0 };

    let x = position.x;
    let y = position.y;

    // Tenta abrir à esquerda do botão
    if (position.x + BUTTON_SIZE / 2 > windowSize.width / 2) {
      x = position.x - MENU_WIDTH + BUTTON_SIZE / 2;
    } else { // Tenta abrir à direita
      x = position.x + BUTTON_SIZE / 2;
    }

    // Ajusta verticalmente
    y = position.y - MENU_HEIGHT_ESTIMATE / 2 + BUTTON_SIZE / 2;

    // Garante que o menu não saia da tela
    x = Math.max(SCREEN_PADDING, Math.min(x, windowSize.width - MENU_WIDTH - SCREEN_PADDING));
    y = Math.max(SCREEN_PADDING, Math.min(y, windowSize.height - MENU_HEIGHT_ESTIMATE - SCREEN_PADDING));
    
    return { x, y, opacity: 1, scale: 1 };
  }, [isOpen, position, windowSize]);


  const dragConstraints = useMemo(() => ({
    top: SCREEN_PADDING,
    left: SCREEN_PADDING,
    right: windowSize.width - BUTTON_SIZE - SCREEN_PADDING,
    bottom: windowSize.height - BUTTON_SIZE - SCREEN_PADDING,
  }), [windowSize]);

  if (windowSize.width === 0) return null; // Não renderiza nada até ter o tamanho da janela


  return (
    <>
      {/* Overlay quando aberto */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Menu Aberto */}
      <motion.div
        initial={false}
        animate={isOpen ? menuPosition : { scale: 0, opacity: 0, x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed z-[9999] w-60 overflow-hidden rounded-2xl border border-purple-500/30 bg-gray-900/95 p-2 shadow-2xl backdrop-blur-md md:hidden"
      >
        <div className="flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
          <div className="mb-2 flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Navegação</span>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-white/10">
              <X size={18} className="text-white/70" />
            </button>
          </div>
          
          {navItems.map((category) => {
            const isSubMenuActive = category.subItems?.some((sub) => location.pathname.startsWith(sub.path));
            const isMenuOpen = openMenu === category.name;

            return (
              <div key={category.name} className="overflow-hidden">
                <button
                  onClick={() => handleMenuToggle(category.name)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-all text-left ${
                    isMenuOpen
                      ? "bg-purple-600/20 text-purple-400" 
                      : isSubMenuActive 
                        ? "bg-purple-600/10 text-purple-500"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {React.cloneElement(category.icon as React.ReactElement, { className: 'w-5 h-5' })}
                    <span className="font-semibold text-sm">{category.name}</span>
                  </div>
                  <ChevronRight size={16} className={`transform transition-transform ${isMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-6 pr-2 pt-1 pb-2"
                    >
                      {category.subItems?.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                          className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 transition-all text-left ${
                            location.pathname.startsWith(item.path)
                              ? "text-purple-300" 
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4' })}
                          <span className="font-medium text-xs">{item.name}</span>
                          {location.pathname.startsWith(item.path) && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-400" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}


          <div className="mt-2 border-t border-white/10 pt-2">
            <button
              onClick={() => handleLogout()}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-400 transition-all hover:bg-red-500/10"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Botão Flutuante (Arraste) */}
      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={savePosition}
        dragConstraints={dragConstraints}
        initial={{ x: windowSize.width - BUTTON_SIZE - SCREEN_PADDING, y: windowSize.height / 2 }}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="fixed z-[9999] md:hidden cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none", width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-full w-full items-center justify-center rounded-full shadow-lg transition-colors bg-purple-600 hover:bg-purple-500 border-2 border-purple-400/50"
          animate={{
            boxShadow: [
              "0 0 10px rgba(168, 85, 247, 0.5)",
              "0 0 25px rgba(168, 85, 247, 0.8)",
              "0 0 10px rgba(168, 85, 247, 0.5)",
            ],
          }}
          transition={{
            duration: 1.5, // Aumentando a velocidade da pulsação
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isOpen ? "x" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? <X size={28} className="text-white" /> : <MenuIcon size={28} className="text-white" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </>
  );
};