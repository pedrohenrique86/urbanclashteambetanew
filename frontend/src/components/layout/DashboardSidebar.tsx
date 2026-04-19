
 import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  ChevronRightIcon,
  UserGroupIcon,
  SparklesIcon,
  Bars3Icon,
  BriefcaseIcon,
  ScaleIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  LockClosedIcon,
  MapIcon,
  GlobeAltIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  UserCircleIcon,
  StarIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  FireIcon,
  ArrowLeftOnRectangleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  RectangleStackIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

import { useGameClock } from "../../hooks/useGameClock";
import GameClockDisplay from "./GameClockDisplay";
import AdminMenu from "../admin/AdminMenu";
import { Tooltip } from "react-tooltip";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";

// Tipagem para os itens de menu e sub-menu
interface SubMenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string; // Opcional, para itens que são links diretos
  subItems?: SubMenuItem[];
}

// Nova estrutura de dados do menu
export const navItems: NavItem[] = [
  {
    name: "Operações",
    icon: <BriefcaseIcon className="w-5 h-5" />,
    subItems: [
      {
        name: "Contratos",
        path: "/contracts",
        icon: <DocumentTextIcon className="w-4 h-4" />,
      },
      {
        name: "Acerto de Contas",
        path: "/reckoning",
        icon: <ShieldExclamationIcon className="w-4 h-4" />,
      },
      {
        name: "Guerra de Esquadrão",
        path: "/squad-war",
        icon: <FireIcon className="w-4 h-4" />,
      },
      {
        name: "Estação de Suprimentos",
        path: "/supply-station",
        icon: <BuildingStorefrontIcon className="w-4 h-4" />,
      },
      {
        name: "Base de Recuperação",
        path: "/recovery-base",
        icon: <HeartIcon className="w-4 h-4" />,
      },
      {
        name: "Isolamento",
        path: "/isolation",
        icon: <LockClosedIcon className="w-4 h-4" />,
      },
    ],
  },
  {
    name: "Economia",
    icon: <ScaleIcon className="w-5 h-5" />,
    subItems: [
      {
        name: "Zonas Sombrias",
        path: "/dark-zones",
        icon: <MapIcon className="w-4 h-4" />,
      },
      {
        name: "Rede Paralela",
        path: "/parallel-network",
        icon: <GlobeAltIcon className="w-4 h-4" />,
      },
      {
        name: "Cofre",
        path: "/safe",
        icon: <BuildingLibraryIcon className="w-4 h-4" />,
      },
      {
        name: "Corporações",
        path: "/corporations",
        icon: <BuildingOffice2Icon className="w-4 h-4" />,
      },
      {
        name: "Bolsa Sombria",
        path: "/dark-market",
        icon: <CurrencyDollarIcon className="w-4 h-4" />,
      },
      {
        name: "Deck Paralelo",
        path: "/parallel-deck",
        icon: <RectangleStackIcon className="w-4 h-4" />,
      },
      {
        name: "Circuito da Rede",
        path: "/network-circuit",
        icon: <CpuChipIcon className="w-4 h-4" />,
      },
    ],
  },
  {
    name: "Rede",
    icon: <UserGroupIcon className="w-5 h-5" />,
    subItems: [
      { name: "QG", path: "/qg", icon: <FlagIcon className="w-4 h-4" /> },
      {
        name: "Ranking",
        path: "/ranking",
        icon: <ChartBarIcon className="w-4 h-4" />,
      },
      {
        name: "Zona Social",
        path: "/social-zone",
        icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
      },
      {
        name: "Treinamento",
        path: "/training",
        icon: <AcademicCapIcon className="w-4 h-4" />,
      },
      {
        name: "Identidade Digital",
        path: "/digital-identity",
        icon: <UserCircleIcon className="w-4 h-4" />,
      },
      {
        name: "Arsenal Tático",
        path: "/tactical-arsenal",
        icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
      },
      {
        name: "Registros da Rede",
        path: "/network-logs",
        icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      },
      {
        name: "Temporada",
        path: "/season",
        icon: <CalendarDaysIcon className="w-4 h-4" />,
      },
    ],
  },
  {
    name: "Elite",
    icon: <SparklesIcon className="w-5 h-5" />,
    subItems: [
      {
        name: "Acesso VIP",
        path: "/vip-access",
        icon: <StarIcon className="w-4 h-4" />,
      },
      {
        name: "Loja Restrita",
        path: "/restricted-store",
        icon: <ShoppingBagIcon className="w-4 h-4" />,
      },
    ],
  },
];

interface DashboardSidebarProps {
  onMobileClose?: () => void;
  username?: string;
  faction?: "gangsters" | "guardas";
  handleLogout: () => void;
  isAdmin?: boolean;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  onMobileClose,
  username,
  faction,
  handleLogout,
  isAdmin,
}) => {
  const { remainingTime, status, serverTime } = useGameClock();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.warn("Erro ao ler estado do sidebar do localStorage", error);
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem("sidebar_collapsed", JSON.stringify(newState));
      return newState;
    });
  }, []);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);

  // Sincronizar abertura automática com a rota atual
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname.startsWith(sub.path))) {
        setOpenMenu(item.name);
      }
    });

    // Se for uma rota de admin (exemplo: /admin/dashboard), abre o menu admin
    if (location.pathname.startsWith('/admin')) {
      setIsAdminMenuOpen(true);
    }
  }, [location.pathname]);

  const handleMenuToggle = useCallback((name: string) => {
    setOpenMenu(prev => (prev === name ? null : name));
  }, []);

  const subMenuVariants = {
    hidden: { opacity: 0, x: -10, height: 0 },
    visible: {
      opacity: 1,
      x: 0,
      height: "auto",
      transition: { staggerChildren: 0.05, when: "beforeChildren" },
    },
  };

  const subMenuItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  const factionGradient = useMemo(
    () => {
      const canonical = FACTION_ALIAS_MAP_FRONTEND[String(faction).toLowerCase().trim()] || "gangsters";
      return canonical === "gangsters" ? "from-orange-300 to-orange-600" : "from-blue-300 to-blue-600";
    },
    [faction]
  );

  return (
    <>
      <aside
        ref={sidebarRef}
        className={[
          "bg-black/25 backdrop-blur-xl border-slate-700/50 flex-shrink-0 flex flex-col items-center relative z-10 h-full border-r border-white/10 rounded-r-xl transition-all duration-300 ease-in-out overflow-x-hidden",
          isCollapsed ? "w-10 pb-10" : "w-48 pb-14",
        ].join(" ")}
        style={{ boxShadow: "inset -4px 0 12px -4px rgba(0,0,0,0.4)" }}
      >
      <div className="w-full px-4 pt-2 pb-2 text-center">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-base font-orbitron whitespace-nowrap">
                <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                  Urban
                </span>
                <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                  Clash
                </span>
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold">
                  Team
                </span>
              </span>
              <div
                className={`mt-1 font-orbitron font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${factionGradient} text-xs whitespace-nowrap`}
              >
                {username || "Usuário"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`w-full flex ${isCollapsed ? "flex-col space-y-0 mb-0" : "justify-center gap-1.5 px-4 mb-2"} items-center relative`}
      >
        <Link
          to="/dashboard"
          onClick={() => { 
            setOpenMenu(null); 
            setIsAdminMenuOpen(false); 
            if (onMobileClose) onMobileClose(); 
          }}
          className={`group flex items-center justify-center w-9 h-9 transition-all duration-300 active:scale-95 ${
            isCollapsed ? "rounded-none" : "rounded-xl"
          } ${
            location.pathname === "/dashboard"
              ? "bg-purple-600/20 text-purple-400 border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              : "bg-white/5 text-slate-400 border border-white/10 hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content="Início"
        >
          <HomeIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
        </Link>

        <button
          onClick={toggleSidebar}
          className={`hidden md:flex group items-center justify-center w-9 h-9 bg-white/5 text-slate-400 border border-white/10 transition-all duration-300 hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/10 active:scale-95 ${isCollapsed ? "rounded-none" : "rounded-xl"}`}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content={isCollapsed ? "Expandir" : "Encolher"}
        >
          <ArrowsRightLeftIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
        </button>

        <button
          onClick={handleLogout}
          className={`hidden md:flex group items-center justify-center w-9 h-9 bg-white/5 text-slate-400 border border-white/10 transition-all duration-300 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 active:scale-95 ${isCollapsed ? "rounded-none" : "rounded-xl"}`}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content="Desconectar"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
        </button>
        {/* Botão de fechar apenas no mobile */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden flex justify-center items-center p-2 text-slate-400 hover:text-white"
            aria-label="Fechar menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Divisor Tático entre Controles e Menu */}
      <div className="w-full border-b border-white/10 mb-1 opacity-50"></div>

      <nav className="flex flex-col gap-0 w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItems.map((item) => {
          const isSubMenuActive = item.subItems?.some((sub) =>
            location.pathname.startsWith(sub.path),
          );
          const isMenuOpen = openMenu === item.name;

          if (item.subItems) {
            return (
              <div
                key={item.name}
                className="overflow-hidden w-full"
              >
                <button
                  onClick={() => handleMenuToggle(item.name)}
                  className={`w-full flex items-center transition-all duration-200 
                    ${isCollapsed 
                      ? `border justify-center w-9 h-9 mx-auto ${isMenuOpen ? "text-purple-400 bg-purple-500/10 border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "text-slate-400 hover:text-white hover:bg-purple-500/5 border-white/10 hover:border-purple-500/40"}` 
                      : `py-1.5 border-l-4 ${isMenuOpen ? "border-purple-500 text-purple-400 bg-purple-500/10" : "border-transparent text-slate-400"} justify-between px-8 hover:text-white hover:bg-purple-500/10`
                    }`}
                  data-tooltip-id="sidebar-tooltip"
                  data-tooltip-content={isCollapsed ? item.name : undefined}
                  aria-expanded={isMenuOpen}
                  aria-controls={`submenu-${item.name}`}
                >
                  <div className="flex items-center justify-center">
                    {item.icon}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                          animate={{
                            opacity: 1,
                            width: "auto",
                            marginLeft: "0.75rem",
                          }}
                          exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-medium whitespace-nowrap text-sm"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {!isCollapsed && (
                    <ChevronRightIcon
                      className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-90" : ""}`}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.ul
                      id={`submenu-${item.name}`}
                      variants={subMenuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className={`flex flex-col w-full items-center ${isCollapsed ? "px-0 py-1 gap-1" : "items-start pl-12 pr-4"}`}
                    >
                      {item.subItems.map((subItem) => {
                        const isActive = location.pathname.startsWith(
                          subItem.path,
                        );
                        return (
                          <motion.li
                            key={subItem.path}
                            variants={subMenuItemVariants}
                            className="w-full"
                          >
                            <Link
                              to={subItem.path}
                              onClick={() => {
                                if (onMobileClose) onMobileClose();
                              }}
                              className={`w-full flex items-center transition-colors duration-200 ${isCollapsed ? 'justify-center py-1' : 'gap-2 py-1'} text-[11px] md:text-xs leading-tight rounded-md ${isActive
                                ? "text-purple-400"
                                : "text-slate-400 hover:text-white"
                                }`}
                              data-tooltip-id="sidebar-tooltip"
                              data-tooltip-content={isCollapsed ? subItem.name : undefined}
                            >
                              <div className="flex-shrink-0">{subItem.icon}</div>
                              {!isCollapsed && <span className="line-clamp-2">{subItem.name}</span>}
                            </Link>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // Para itens de link direto como o Dashboard
          return (
            <Link
              key={item.name}
              to={item.path || "#"}
              onClick={onMobileClose}
              className={`flex items-center text-slate-400 hover:text-white hover:bg-purple-500/10 transition-all duration-200 ${isCollapsed ? "border-l-0 justify-center px-0 py-1.5" : `py-1.5 border-l-4 ${location.pathname === item.path ? "border-purple-500 text-white bg-purple-500/10" : "border-transparent"} justify-start px-8`}`}
              data-tooltip-id="sidebar-tooltip"
              data-tooltip-content={item.name}
            >
              {item.icon}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{
                      opacity: 1,
                      width: "auto",
                      marginLeft: "0.75rem",
                    }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium whitespace-nowrap text-sm"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            className={`w-full flex items-center transition-all duration-200 
              ${isCollapsed 
                ? `border-l-0 justify-center px-0 py-2 ${isAdminMenuOpen ? "text-purple-400 bg-purple-500/10" : "text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"}` 
                : `py-2 border-l-4 ${isAdminMenuOpen ? "border-purple-500 text-purple-400 bg-purple-500/10" : "border-transparent text-slate-400"} justify-start px-8 hover:text-white hover:bg-purple-500/10`
              }`}
            data-tooltip-id="sidebar-tooltip"
            data-tooltip-content="Admin"
          >
            <ShieldCheckIcon className="w-4 h-4 md:w-5 md:h-5" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                  animate={{
                    opacity: 1,
                    width: "auto",
                    marginLeft: "0.75rem",
                  }}
                  exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium whitespace-nowrap text-sm"
                >
                  Admin
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </nav>

      {/* Game Clock Display (Desktop Only) */}
      <div className="hidden md:block absolute bottom-0 left-0 right-0 w-full px-2 pb-0 pt-1">
        <GameClockDisplay
          remainingTime={remainingTime}
          status={status}
          serverTime={serverTime}
          isCollapsed={isCollapsed}
        />
      </div>

      {/* Admin Menu */}
      <AnimatePresence>
        {isAdminMenuOpen && (
          <AdminMenu onClose={() => setIsAdminMenuOpen(false)} />
        )}
      </AnimatePresence>
      </aside>

    <Tooltip 
      id="sidebar-tooltip" 
      place="right" 
      delayShow={10} 
      border="1px solid rgba(255,255,255,0.1)"
      style={{ 
        backgroundColor: '#1e293b', 
        color: '#fff', 
        fontSize: '11px',
        padding: '4px 8px',
        borderRadius: '4px',
        zIndex: 9999,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
      }} 
    />
  </>
);
};

export default DashboardSidebar;