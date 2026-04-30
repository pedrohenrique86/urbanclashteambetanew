import React, { useState } from "react";
import {
  calculateCombatStats,
  getCriticalChanceExplanation,
  getCriticalDamageExplanation,
} from "../../utils/combat";
import UserInfoCard from "../dashboard/UserInfoCard";
import {
  BriefcaseIcon,
  ScaleIcon,
  UsersIcon,
  SparklesIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  FireIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

interface User {
  level?: number;
  current_xp?: number;
  energy?: number;
  action_points?: number;
  money?: number;
  attack?: number;
  defense?: number;
  focus?: number;
  critical_chance?: number;
  faction?: string;
}

interface SidebarProps {
  userProfile: User;
  themeClasses: {
    bg: string;
    cardBg: string;
    sidebarBg: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
    buttonSecondary: string;
    shadow: string;
  };
  openMenus: {
    operacoes: boolean;
    economia: boolean;
    rede: boolean;
    elite: boolean;
  };
  toggleMenu: (menu: "operacoes" | "economia" | "rede" | "elite") => void;
  keepMenuOpen: (menu: "operacoes" | "economia" | "rede" | "elite") => void;
  navigateTo: (path: string) => void;
  isCompact: boolean;
  currentPath?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userProfile,
  themeClasses,
  openMenus,
  toggleMenu,
  keepMenuOpen,
  navigateTo,
  isCompact,
  currentPath,
}) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const combatStats = calculateCombatStats(userProfile);

  // Função para formatar valores acima de 1000 como 1k
  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${Math.floor(value / 1000)}k`;
    }
    return value.toString();
  };

  // Definições dos menus
  const menuItems = [
    {
      title: "Operações",
      path: "/operacoes",
      icon: <BriefcaseIcon className="w-6 h-6" />,
      subItems: [
        {
          title: "Contratos",
          path: "/contracts",
          icon: <DocumentTextIcon className="w-5 h-5" />,
        },
        {
          title: "Acerto de Contas",
          path: "/reckoning",
          icon: <ShieldExclamationIcon className="w-5 h-5" />,
          isNew: (userProfile?.level || 1) >= 10,
        },
        {
          title: "Guerra de Esquadrões",
          path: "/squad-war",
          icon: <FireIcon className="w-5 h-5" />,
        },
        {
          title: "Guerra de Esquadrões",
          path: "/squad-war",
          icon: <FireIcon className="w-5 h-5" />,
        },
        {
          title: "Estação de Suprimentos",
          path: "/supply-station",
          icon: <BuildingStorefrontIcon className="w-5 h-5" />,
        },
        {
          title: "Base de Recuperação",
          path: "/recovery-base",
          icon: <HeartIcon className="w-5 h-5" />,
        },
        {
          title: "Isolamento",
          path: "/isolation",
          icon: <LockClosedIcon className="w-5 h-5" />,
        },
      ],
    },
    {
      title: "Economia",
      path: "/economia",
      icon: <ScaleIcon className="w-6 h-6" />,
    },
    { title: "Rede", path: "/rede", icon: <UsersIcon className="w-6 h-6" /> },
    { title: "Elite", path: "/elite", icon: <SparklesIcon className="w-6 h-6" /> },
  ];

  return (
    <div
      className={`${isCompact ? "w-20" : "w-64"} ${themeClasses.sidebarBg} h-screen fixed left-0 top-0 z-10 ${themeClasses.shadow} transition-all duration-300 flex flex-col`}
    >
      {/* Logo e Botão Dashboard */}
      <div className="p-4 mb-1 flex items-center justify-between">
        {isCompact ? (
          <div className="flex flex-col items-center w-full">
            <button
              className={`w-10 h-10 ${themeClasses.text} hover:text-red-400 rounded-full transition-colors text-sm flex items-center justify-center ${
                currentPath === "/dashboard" ? "text-red-400 bg-red-500/10" : ""
              }`}
              onClick={() => navigateTo("/dashboard")}
              title="Dashboard"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </button>
          </div>
        ) : (
          <UserInfoCard
            userProfile={userProfile}
            combatStats={combatStats}
            themeClasses={themeClasses}
            compact={true}
          />
        )}
        {!isCompact && (
          <button
            className={`w-10 h-10 ${themeClasses.text} hover:text-red-400 rounded-full transition-colors text-sm flex items-center justify-center ${
              currentPath === "/dashboard" ? "text-red-400 bg-red-500/10" : ""
            }`}
            onClick={() => navigateTo("/dashboard")}
            title="Dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Informações do Usuário */}
      <div
        className={`mx-2 mb-2 p-2 ${themeClasses.cardBg} rounded-lg ${themeClasses.shadow}`}
      >
        {isCompact && (
          <div className="text-center space-y-2">
            <div className="space-y-1 text-xs">
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-green-400">NV</span>
                <span className="font-bold">
                  {formatValue(userProfile?.level || 1)}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-purple-400">XP</span>
                <span className="font-bold">
                  {formatValue(userProfile?.current_xp || 0)}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-orange-400">EN</span>
                <span className="font-bold">
                  {formatValue(userProfile?.energy || 100)}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-green-400">AP</span>
                <span className="font-bold">
                  {formatValue(userProfile?.action_points || 10)}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-yellow-400">$</span>
                <span className="font-bold">
                  {formatValue(userProfile?.money || 0)}
                </span>
              </div>
              <div 
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={(combatStats?.attack || userProfile?.attack || 0).toFixed(2)}
              >
                <span className="text-red-400">ATK</span>
                <span className="font-bold">
                  {formatValue(combatStats?.attack || userProfile?.attack || 0)}
                </span>
              </div>
              <div 
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={(combatStats?.defense || userProfile?.defense || 0).toFixed(2)}
              >
                <span className="text-blue-400">DEF</span>
                <span className="font-bold">
                  {formatValue(
                    combatStats?.defense || userProfile?.defense || 0,
                  )}
                </span>
              </div>
              <div 
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={(combatStats?.focus || userProfile?.focus || 0).toFixed(2)}
              >
                <span className="text-purple-400">FOC</span>
                <span className="font-bold">
                  {formatValue(combatStats?.focus || userProfile?.focus || 0)}
                </span>
              </div>
              <div
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={getCriticalChanceExplanation()}
              >
                <span className="text-cyan-400">CH.C</span>
                <span className="font-bold">
                  {(
                    combatStats?.criticalChance ||
                    userProfile?.critical_chance ||
                    0
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={getCriticalDamageExplanation(userProfile?.faction || "")}
              >
                <span className="text-pink-400">DA.C</span>
                <span className="font-bold">
                  {(combatStats?.criticalDamage || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav
        className={`${isCompact ? "px-2" : "px-4"} flex-1 overflow-y-auto custom-scrollbar pb-4`}
      >
        <ul className="space-y-2 mt-4">
          {!isCompact ? (
            menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => {
                    if (item.subItems) {
                      setOpenSubmenu(
                        openSubmenu === item.path ? null : item.path,
                      );
                    } else {
                      navigateTo(item.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    (currentPath?.startsWith(item.path) && !item.subItems) ||
                    openSubmenu === item.path
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
                  }`}
                >
                  <div className="flex items-center">
                    <span className="w-6 h-6">{item.icon}</span>
                    <span className="ml-4 text-lg font-medium">
                      {item.title}
                    </span>
                  </div>
                  {item.subItems ? (
                    <ChevronRightIcon
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        openSubmenu === item.path ? "rotate-90" : ""
                      }`}
                    />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {item.subItems && openSubmenu === item.path && (
                  <ul className="pl-8 pt-2 space-y-1">
                    {item.subItems.map((subItem) => (
                      <li key={subItem.path}>
                        <button
                          onClick={() => navigateTo(subItem.path)}
                          className={`w-full text-left p-2 rounded-lg text-base transition-colors flex items-center ${
                            currentPath === subItem.path
                              ? "text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <span className="w-5 h-5 mr-3 text-gray-500">
                            {subItem.icon}
                          </span>
                          <span>{subItem.title}</span>
                          {(subItem as any).isNew && (
                            <span className="ml-auto flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))
          ) : (
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    if (!item.subItems) {
                      navigateTo(item.path);
                    }
                  }}
                  title={item.title}
                  className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                    currentPath?.startsWith(item.path)
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
                  }`}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          )}
        </ul>
      </nav>
    </div>
  );
};