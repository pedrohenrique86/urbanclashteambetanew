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
const navItems: NavItem[] = [
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
        name: "Extração de Suprimentos",
        path: "/supply-extraction",
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
      { name: "QG", path: "/clan", icon: <FlagIcon className="w-4 h-4" /> },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);

  const handleMenuToggle = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sidebarVariants = {
    expanded: { width: "14rem" }, // 224px
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
    <motion.aside
      ref={sidebarRef}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-black/20 backdrop-blur-xl border-r border-slate-700/50 flex-shrink-0 flex flex-col items-center relative z-10 h-full rounded-r-xl"
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
        className={`w-full px-4 mb-4 flex ${isCollapsed ? "flex-col gap-4" : "justify-center gap-4"} items-center relative`}
      >
        <Link
          to="/dashboard"
          onClick={onMobileClose}
          className={`flex justify-center items-center p-2 rounded-lg transition-colors ${
            location.pathname === "/dashboard"
              ? "text-purple-400 bg-purple-500/10"
              : "text-slate-400 hover:text-white hover:bg-purple-500/10"
          }`}
          title="Dashboard"
        >
          <HomeIcon className="w-4 h-4" />
        </Link>
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            if (!isCollapsed) setOpenMenu(null); // Fecha submenus ao colapsar
          }}
          className="hidden md:flex justify-center items-center p-2 text-slate-400 hover:text-white hover:bg-purple-500/10 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="hidden md:flex justify-center items-center p-2 text-slate-400 hover:text-white hover:bg-purple-500/10 rounded-lg transition-colors"
          title="Sair"
        >
          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
        </button>
        {/* Botão de fechar apenas no mobile */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden absolute right-4 flex justify-center items-center p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-1 w-full flex-1 overflow-y-auto custom-scrollbar pb-6">
        {navItems.map((item) => {
          const isSubMenuActive = item.subItems?.some((sub) =>
            location.pathname.startsWith(sub.path),
          );
          const isMenuOpen = openMenu === item.name;

          if (item.subItems) {
            return (
              <div key={item.name} className="overflow-hidden">
                <button
                  onClick={() => handleMenuToggle(item.name)}
                  className={`w-full flex items-center py-2 text-slate-400 hover:text-white hover:bg-purple-500/10 transition-all duration-200 border-l-4 ${
                    isSubMenuActive && !isMenuOpen
                      ? "border-purple-500"
                      : "border-transparent"
                  } ${isCollapsed ? "justify-center" : "justify-between px-8"}`}
                >
                  <div className="flex items-center">
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
                          className="font-semibold whitespace-nowrap text-sm"
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
                  {isMenuOpen && !isCollapsed && (
                    <motion.ul
                      variants={subMenuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="pl-12 pr-4 flex flex-col items-start"
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
                                setOpenMenu(null);
                                if (onMobileClose) onMobileClose();
                              }}
                              className={`w-full flex items-center gap-2 py-1.5 text-xs rounded-md transition-colors duration-200 ${
                                isActive
                                  ? "text-purple-400"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              {subItem.icon}
                              {subItem.name}
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
              className={`flex items-center py-2 text-slate-400 hover:text-white hover:bg-purple-500/10 transition-all duration-200 border-l-4 ${
                location.pathname === item.path
                  ? "border-purple-500 text-white bg-purple-500/10"
                  : "border-transparent"
              } ${isCollapsed ? "justify-center" : "justify-start px-8"}`}
              title={item.name}
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
                    className="font-semibold whitespace-nowrap"
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
            className={`w-full flex items-center py-2 text-slate-400 hover:text-white hover:bg-purple-500/10 transition-all duration-200 border-l-4 ${
              isAdminMenuOpen
                ? "border-purple-500 text-white bg-purple-500/10"
                : "border-transparent"
            } ${isCollapsed ? "justify-center" : "justify-start px-8"}`}
            title="Admin"
          >
            <ShieldCheckIcon className="w-5 h-5" />
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
                  className="font-semibold whitespace-nowrap"
                >
                  Admin
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </nav>

      {/* Game Clock Display */}
      <div className="w-full px-2 pb-2 mt-auto">
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
  );
};

export default DashboardSidebar;
