
 import React, { useState, useRef, useEffect } from "react";
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
} from "@heroicons/react/24/outline";

import { useGameClock } from "../../hooks/useGameClock";
import GameClockDisplay from "./GameClockDisplay";
import AdminMenu from "../admin/AdminMenu";
import { Tooltip } from "react-tooltip";

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

  const toggleSidebar = () => {
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem("sidebar_collapsed", JSON.stringify(newState));
      return newState;
    });
  };

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

  const handleMenuToggle = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const sidebarVariants = {
    expanded: { width: "12rem" }, // 192px
    collapsed: { width: "2.5rem" }, // 40px
  };

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

  return (
    <>
      <motion.aside
      ref={sidebarRef}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`bg-black/20 backdrop-blur-xl border-slate-700/50 flex-shrink-0 flex flex-col items-center relative z-10 h-full border-l rounded-l-xl md:border-l-0 md:rounded-l-none md:border-r md:rounded-r-xl ${isCollapsed ? 'pb-[40px]' : 'pb-[60px]'} overflow-x-hidden`}
      style={{ boxShadow: "inset -5px 0 15px -5px rgba(0,0,0,0.5)" }}
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
                className={`mt-1 font-orbitron font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${faction === "gangsters" ? "from-orange-300 to-orange-600" : "from-blue-300 to-blue-600"} text-xs whitespace-nowrap`}
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
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3.5L3.5 10.3M12 3.5L20.5 10.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5.5 11.5V18C5.5 19.3807 6.61929 20.5 8 20.5H16C17.3807 20.5 18.5 19.3807 18.5 18V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9.5 14.5C9.5 14.5 10.5 13.5 12 13.5C13.5 13.5 14.5 14.5 14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>

        <button
          onClick={toggleSidebar}
          className={`hidden md:flex group items-center justify-center w-9 h-9 bg-white/5 text-slate-400 border border-white/10 transition-all duration-300 hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/10 active:scale-95 ${isCollapsed ? "rounded-none" : "rounded-xl"}`}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content={isCollapsed ? "Expandir" : "Encolher"}
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8H20M4 12H13M4 16H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <button
          onClick={handleLogout}
          className={`hidden md:flex group items-center justify-center w-9 h-9 bg-white/5 text-slate-400 border border-white/10 transition-all duration-300 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 active:scale-95 ${isCollapsed ? "rounded-none" : "rounded-xl"}`}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content="Desconectar"
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 12H20M20 12L17 9M20 12L17 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {/* Botão de fechar apenas no mobile */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden flex justify-center items-center p-2 text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                >
                  <div className="flex items-center justify-center">
                    {isCollapsed ? (
                      item.name === "Operações" ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 10H21V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M9 10V6C9 4.34315 10.3431 3 12 3C13.6569 3 15 4.34315 15 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M10 15H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : item.name === "Economia" ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M2.5 9H21.5M2.5 15H21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M11 2.5C11 2.5 9 5 9 12C9 19 11 21.5 11 21.5M13 2.5C13 2.5 15 5 15 12C15 19 13 21.5 13 21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : item.name === "Rede" ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M4 20C4 17 8 15 12 15M20 20C20 17 16 15 12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : item.name === "Elite" ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 17L5 21L6.5 13.5L1 8.5L8.5 8L12 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M15.5 8L23 8.5L17.5 13.5L19 21L12 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : item.icon
                    ) : item.icon}
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
    </motion.aside>

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