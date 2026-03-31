import React, { useState, useRef, useEffect } from "react";
import { menuCategories } from "../constants/menuItems";
import AdminMenu from "../admin/AdminMenu";
import { UserProfile } from "../../types";
import GameClockDisplay from "./GameClockDisplay"; // Importa o novo componente
import { useGameClock } from "../../hooks/useGameClock"; // Importa o novo hook

interface BottomNavBarProps {
  navigateTo: (path: string) => void;
  userProfile: UserProfile | null;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  navigateTo,
  userProfile,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isAdminMenuOpen, setAdminMenuOpen] = useState(false);
  const { remainingTime, status, serverTime } = useGameClock(); // Usa o novo hook

  const isAdmin = userProfile?.is_admin === true;
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (category: string) => {
    setOpenMenu(openMenu === category ? null : category);
  };

  const handleNavigate = (path: string) => {
    navigateTo(path);
    setOpenMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-t-2 border-t-amber-800/50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50 flex flex-col md:flex-row justify-between items-center px-2 sm:px-4 lg:px-8 pt-2 md:pt-0 md:h-24"
    >
      {/* Botões de Navegação (Esquerda no Desktop, Topo no Mobile) */}
      <div className="flex items-center justify-center space-x-1 sm:space-x-2 md:space-x-6 order-1">
        {Object.entries(menuCategories).map(([key, category]) => (
          <div key={key} className="relative">
            <button
              onClick={() => {
                if (key === "principal") {
                  handleNavigate("/dashboard");
                } else {
                  toggleMenu(key);
                }
              }}
              className="flex flex-col items-center justify-center text-white w-16 h-16 rounded-full transition-all duration-300 hover:bg-amber-500/20 focus:outline-none"
            >
              <span className="text-3xl">{category.icon}</span>
              <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                {category.title}
              </span>
            </button>
            {openMenu === key && (
              <div className="absolute bottom-full mb-2 w-52 sm:w-56 bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-lg border border-gray-700/50 overflow-hidden">
                <ul className="p-2">
                  {category.items.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className="w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 text-white/90 flex items-center space-x-3 hover:bg-amber-500/20 rounded-md transition-colors duration-200"
                      >
                        <span className="text-xl sm:text-2xl">{item.icon}</span>
                        <span className="text-sm sm:text-base">
                          {item.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {/* Botão de Admin (Apenas para o admin) */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setAdminMenuOpen(!isAdminMenuOpen)}
              className="flex flex-col items-center justify-center text-purple-300 w-16 h-16 rounded-full transition-all duration-300 hover:bg-purple-500/20 focus:outline-none"
            >
              <span className="text-3xl">⚙️</span>
              <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                Admin
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Relógio e Contagem Regressiva (Direita no Desktop, Abaixo no Mobile) */}
      <div className="w-full md:w-auto order-2 flex justify-center px-4 md:px-0">
        <GameClockDisplay
          remainingTime={remainingTime}
          status={status}
          serverTime={serverTime}
        />
      </div>

      {/* Menu de Admin Flutuante */}
      {isAdminMenuOpen && <AdminMenu onClose={() => setAdminMenuOpen(false)} />}
    </div>
  );
};

export default BottomNavBar;