import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Home,
  UserCircle,
  PlusCircle,
  MinusCircle
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
  const [editingShortcut, setEditingShortcut] = useState<number | null>(null);
  const [customShortcuts, setCustomShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_shortcuts");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Garante que temos sempre 2 atalhos, mesmo que o salvo seja inválido
        if (Array.isArray(parsed) && parsed.length === 2) {
          // Apenas carrega nome e path, o ícone é recuperado na renderização
          return parsed.map(p => ({ name: p.name || null, path: p.path || null }));
        }
      }
    } catch (e) {
      console.error("Falha ao carregar atalhos:", e);
    }
    return [
      { name: null, path: null },
      { name: null, path: null },
    ];
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogout } = useUserProfile();

  // Salva os atalhos no localStorage sempre que eles mudam
  useEffect(() => {
    try {
      localStorage.setItem("custom_shortcuts", JSON.stringify(customShortcuts));
    } catch (e) {
      console.error("Falha ao salvar atalhos:", e);
    }
  }, [customShortcuts]);
  
  // Controla o estado de abertura do menu principal
  useEffect(() => {
    if (!isOpen) {
      // Quando o menu fecha, reseta o estado do acordeão e da edição de atalhos
      setOpenMenu(null);
      setEditingShortcut(null);
    }
  }, [isOpen]);


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
    const { top, left, right, bottom } = dragConstraints;
    
    const clampedX = Math.max(left, Math.min(info.point.x, right));
    const clampedY = Math.max(top, Math.min(info.point.y, bottom));

    const newPos = { x: clampedX, y: clampedY };
    
    setPosition(newPos);
    localStorage.setItem("floating_menu_position", JSON.stringify(newPos));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleMenuToggle = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
    setEditingShortcut(null); // Fecha a edição de atalho ao abrir outro menu
  };

  const handleShortcutClick = (index: number) => {
    const shortcut = customShortcuts[index];
    if (shortcut.path) {
      handleNavigate(shortcut.path);
    } else {
      setEditingShortcut(editingShortcut === index ? null : index);
      setOpenMenu(null); // Fecha o acordeão ao editar atalho
    }
  };

  const handleShortcutSelect = (page: { name: string; path: string; icon: React.ReactNode }) => {
    if (editingShortcut === null) return;

    const newShortcuts = [...customShortcuts];
    // Salva apenas o nome e o caminho, não o componente do ícone
    newShortcuts[editingShortcut] = { name: page.name, path: page.path };
    setCustomShortcuts(newShortcuts);
    setEditingShortcut(null);
  };

  const handleRemoveShortcut = (index: number) => {
    const newShortcuts = [...customShortcuts];
    newShortcuts[index] = { name: null, path: null };
    setCustomShortcuts(newShortcuts);
  };

  // Lista achatada de todas as páginas navegáveis para seleção de atalho
  const allPages = useMemo(() => 
    navItems.flatMap(category => category.subItems || [])
  , []);



  // Lógica para calcular a posição do menu de forma inteligente
  const menuPosition = useMemo(() => {
    if (!isOpen || windowSize.width === 0) return { x: position.x, y: position.y, opacity: 0 };

    let x = position.x;
    let y = position.y;

    // Decide se o menu abre à esquerda ou à direita do botão
    if (position.x + BUTTON_SIZE / 2 > windowSize.width / 2) {
      x = position.x - MENU_WIDTH + BUTTON_SIZE / 2; // Abre à esquerda
    } else {
      x = position.x + BUTTON_SIZE / 2; // Abre à direita
    }

    // Garante que o menu não saia horizontalmente da tela
    x = Math.max(SCREEN_PADDING, Math.min(x, windowSize.width - MENU_WIDTH - SCREEN_PADDING));

    // Ajusta a posição vertical para garantir que o menu caiba na tela
    const menuMaxHeight = windowSize.height * 0.8; // Corresponde a max-h-[80vh]
    
    // Tenta alinhar o topo do menu com o topo do botão
    y = position.y;

    // Se o menu ultrapassar a parte inferior, ajusta para cima
    if (y + menuMaxHeight > windowSize.height - SCREEN_PADDING) {
      y = windowSize.height - menuMaxHeight - SCREEN_PADDING;
    }

    // Garante que o menu não saia verticalmente da tela (borda superior)
    y = Math.max(SCREEN_PADDING, y);
    
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
            {customShortcuts.map((shortcut, index) => {
              // Encontra a informação completa da página (incluindo o ícone) a partir do path salvo
              const pageInfo = shortcut.path ? allPages.find(p => p.path === shortcut.path) : null;
              const iconToRender = pageInfo ? pageInfo.icon : null;

              return (
              <div key={index} className="mt-1 overflow-hidden">
                <div className="relative group">
                  <button
                    onClick={() => handleShortcutClick(index)}
                    className={`w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-all text-left ${
                      editingShortcut === index
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {shortcut.path && iconToRender ? (
                        React.cloneElement(iconToRender as React.ReactElement, { className: 'w-5 h-5' })
                      ) : (
                        <PlusCircle size={20} className="text-purple-400/80" />
                      )}
                      <span className="font-semibold text-sm">
                        {shortcut.name || `Atalho ${index + 1}`}
                      </span>
                    </div>
                    {!shortcut.path && <ChevronRight size={16} className={`transform transition-transform ${editingShortcut === index ? 'rotate-90' : ''}`} />}
                  </button>

                  {shortcut.path && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveShortcut(index);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-500"
                      title="Remover Atalho"
                    >
                      <MinusCircle size={16} />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {editingShortcut === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pl-6 pr-2 pt-1 pb-2"
                    >
                      {allPages.map((page) => (
                        <button
                          key={page.path}
                          onClick={() => handleShortcutSelect(page)}
                          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 transition-all text-left text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                          {React.cloneElement(page.icon as React.ReactElement, { className: 'w-4 h-4' })}
                          <span className="font-medium text-xs">{page.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )})}
          </div>

          <div className="mt-2 flex items-center gap-1 border-t border-white/10 pt-2">
            <button
              onClick={() => handleLogout()}
              className="flex h-full flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-red-400 transition-all hover:bg-red-500/10"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <button
              onClick={() => handleNavigate('/digital-identity')}
              className="flex h-full flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-amber-400 transition-all hover:bg-amber-500/10"
              title="Identidade Digital"
            >
               <UserCircle size={20} />
            </button>
            <button
              onClick={() => handleNavigate('/dashboard')}
              className="flex h-full flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sky-400 transition-all hover:bg-sky-500/10"
              title="Início"
            >
               <Home size={20} />
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
            duration: 1, // Aumentando a velocidade da pulsação
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