import React, { useState, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Sword, 
  Package, 
  Globe, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  Menu as MenuIcon,
  X
} from "lucide-react";
import { useUserProfile } from "../../hooks/useUserProfile";

export const FloatingMenuButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const { handleLogout } = useUserProfile();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "Contratos", path: "/contracts" },
    { icon: Sword, label: "Confronto", path: "/reckoning" },
    { icon: Package, label: "Suprimentos", path: "/supply-extraction" },
    { icon: Users, label: "Clã", path: "/clan" },
    { icon: Globe, label: "Social", path: "/social-zone" },
    { icon: Settings, label: "Perfil", path: "/profile" },
  ];

  // Carregar posição salva
  useEffect(() => {
    const savedPos = localStorage.getItem("floating_menu_position");
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch (e) {
        // Reset se corrompido
        setPosition({ x: window.innerWidth - 80, y: window.innerHeight / 2 });
      }
    } else {
      // Posição inicial: Meio à direita
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight / 2 });
    }
  }, []);

  const savePosition = (event: any, info: any) => {
    const newPos = { x: info.point.x - 30, y: info.point.y - 30 };
    setPosition(newPos);
    localStorage.setItem("floating_menu_position", JSON.stringify(newPos));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

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
        animate={isOpen ? { 
          scale: 1, 
          opacity: 1,
          x: Math.min(position.x - 120, window.innerWidth - 260),
          y: Math.min(position.y - 150, window.innerHeight - 380)
        } : { 
          scale: 0, 
          opacity: 0,
          x: position.x,
          y: position.y
        }}
        className="fixed z-[9999] w-60 overflow-hidden rounded-2xl border border-purple-500/30 bg-gray-900/95 p-2 shadow-2xl backdrop-blur-md md:hidden"
      >
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Navegação</span>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-white/10">
              <X size={18} className="text-white/70" />
            </button>
          </div>
          
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                location.pathname === item.path 
                  ? "bg-purple-600/20 text-purple-400" 
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {location.pathname === item.path && <div className="ml-auto h-2 w-2 rounded-full bg-purple-500" />}
            </button>
          ))}

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
        dragElastic={0.1}
        onDragEnd={savePosition}
        dragConstraints={{
          top: 20,
          left: 20,
          right: window.innerWidth - 80,
          bottom: window.innerHeight - 80
        }}
        initial={false}
        animate={{ x: position.x, y: position.y }}
        className="fixed z-[9999] md:hidden"
        style={{ touchAction: "none" }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => !isOpen && setIsOpen(true)}
          className={`flex h-16 w-16 cursor-grab items-center justify-center rounded-full shadow-lg transition-colors active:cursor-grabbing ${
            isOpen ? "bg-purple-700" : "bg-purple-600 hover:bg-purple-500"
          } border-2 border-purple-400/50 shadow-purple-500/20`}
        >
          <div className="flex flex-col items-center">
            {isOpen ? <X size={24} className="text-white" /> : (
              <>
                <MenuIcon size={24} className="text-white" />
                <span className="text-[10px] font-bold text-white">MENU</span>
              </>
            )}
          </div>
        </motion.button>
      </motion.div>
    </>
  );
};
