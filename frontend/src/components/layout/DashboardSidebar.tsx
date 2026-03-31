import React, { useState } from "react";
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
} from "@heroicons/react/24/outline";

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
    icon: <BriefcaseIcon className="w-6 h-6" />,
    subItems: [
      {
        name: "Contratos",
        path: "/contracts",
        icon: <DocumentTextIcon className="w-5 h-5" />,
      },
      {
        name: "Acerto de Contas",
        path: "/reckoning",
        icon: <ShieldExclamationIcon className="w-5 h-5" />,
      },
      {
        name: "Extração de Suprimentos",
        path: "/supply-extraction",
        icon: <BuildingStorefrontIcon className="w-5 h-5" />,
      },
      {
        name: "Base de Recuperação",
        path: "/recovery-base",
        icon: <HeartIcon className="w-5 h-5" />,
      },
      {
        name: "Isolamento",
        path: "/isolation",
        icon: <LockClosedIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    name: "Economia",
    icon: <ScaleIcon className="w-6 h-6" />,
    subItems: [
      {
        name: "Zonas Sombrias",
        path: "/dark-zones",
        icon: <MapIcon className="w-5 h-5" />,
      },
      {
        name: "Rede Paralela",
        path: "/parallel-network",
        icon: <GlobeAltIcon className="w-5 h-5" />,
      },
      {
        name: "Cofre",
        path: "/safe",
        icon: <BuildingLibraryIcon className="w-5 h-5" />,
      },
      {
        name: "Corporações",
        path: "/corporations",
        icon: <BuildingOffice2Icon className="w-5 h-5" />,
      },
    ],
  },
  {
    name: "Rede",
    icon: <UserGroupIcon className="w-6 h-6" />,
    subItems: [
      { name: "QG", path: "/clan", icon: <FlagIcon className="w-5 h-5" /> },
      {
        name: "Ranking",
        path: "/ranking",
        icon: <ChartBarIcon className="w-5 h-5" />,
      },
      {
        name: "Zona Social",
        path: "/social-zone",
        icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
      },
      {
        name: "Treinamento",
        path: "/training",
        icon: <AcademicCapIcon className="w-5 h-5" />,
      },
      {
        name: "Identidade Digital",
        path: "/digital-identity",
        icon: <UserCircleIcon className="w-5 h-5" />,
      },
    ],
  },
  {
    name: "Elite",
    icon: <SparklesIcon className="w-6 h-6" />,
    subItems: [
      {
        name: "Acesso VIP",
        path: "/vip-access",
        icon: <StarIcon className="w-5 h-5" />,
      },
      {
        name: "Loja Restrita",
        path: "/restricted-store",
        icon: <ShoppingBagIcon className="w-5 h-5" />,
      },
    ],
  },
];

interface DashboardSidebarProps {
  onMobileClose?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  onMobileClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const location = useLocation();

  const handleMenuToggle = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const sidebarVariants = {
    expanded: { width: "14rem" }, // 224px
    collapsed: { width: "5rem" }, // 80px
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
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-black/40 backdrop-blur-xl border-r border-slate-700/50 flex-shrink-0 flex flex-col items-center pt-24 pb-6 relative z-10 h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
      style={{ boxShadow: "inset -5px 0 15px -5px rgba(0,0,0,0.5)" }}
    >
      <div
        className={`w-full px-4 mb-6 flex ${isCollapsed ? "flex-col gap-4" : "justify-center gap-4"} items-center relative`}
      >
        <Link
          to="/dashboard"
          onClick={onMobileClose}
          className={`flex justify-center items-center p-2 rounded-lg transition-colors ${
            location.pathname === "/dashboard"
              ? "text-orange-400 bg-orange-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          }`}
          title="Dashboard"
        >
          <HomeIcon className="w-6 h-6" />
        </Link>
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            if (!isCollapsed) setOpenMenu(null); // Fecha submenus ao colapsar
          }}
          className="hidden md:flex justify-center items-center p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
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
      <nav className="flex flex-col gap-2 w-full">
        {navItems.map((item) => {
          const isSubMenuActive = item.subItems?.some((sub) =>
            location.pathname.startsWith(sub.path),
          );
          const isMenuOpen = openMenu === item.name;

          if (item.subItems) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => handleMenuToggle(item.name)}
                  className={`w-full flex items-center py-3 text-slate-400 hover:text-white hover:bg-orange-500/10 transition-all duration-200 border-l-4 ${
                    isSubMenuActive && !isMenuOpen
                      ? "border-orange-500"
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
                            marginLeft: "1rem",
                          }}
                          exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                          transition={{ duration: 0.2 }}
                          className="font-semibold whitespace-nowrap"
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
                              onClick={onMobileClose}
                              className={`w-full flex items-center gap-3 py-2.5 text-sm rounded-md transition-colors duration-200 ${
                                isActive
                                  ? "text-orange-400"
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
              className={`flex items-center py-3 text-slate-400 hover:text-white hover:bg-orange-500/10 transition-all duration-200 border-l-4 ${
                location.pathname === item.path
                  ? "border-orange-500 text-white bg-orange-500/10"
                  : "border-transparent"
              } ${isCollapsed ? "justify-center" : "justify-start px-8"}`}
              title={item.name}
            >
              {item.icon}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: "auto", marginLeft: "1rem" }}
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
      </nav>
    </motion.aside>
  );
};

export default DashboardSidebar;
