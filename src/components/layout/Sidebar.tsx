import React from "react";
import {
  calculateCombatStats,
  getCriticalChanceExplanation,
  getCriticalDamageExplanation,
} from "../../utils/combat";
import UserInfoCard from "../dashboard/UserInfoCard";
import SidebarMenu from "./SidebarMenu";

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
    jogo: boolean;
    atividades: boolean;
    social: boolean;
    premium: boolean;
  };
  toggleMenu: (menu: "jogo" | "atividades" | "social" | "premium") => void;
  keepMenuOpen: (menu: "jogo" | "atividades" | "social" | "premium") => void;
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
  const combatStats = calculateCombatStats(userProfile);

  // Função para formatar valores acima de 1000 como 1k
  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${Math.floor(value / 1000)}k`;
    }
    return value.toString();
  };

  // Definições dos menus
  const gameMenuItems = [
    { icon: "📋", label: "Tarefas", path: "/tasks" },
    { icon: "⚔️", label: "Duelos", path: "/duels" },
    { icon: "🍽️", label: "Restaurante", path: "/restaurant" },
    { icon: "🏥", label: "Hospital", path: "/hospital" },
    { icon: "🔒", label: "Prisão", path: "/prison" },
  ];

  const activitiesMenuItems = [
    { icon: "🗺️", label: "Territórios", path: "/territory" },
    { icon: "🛒", label: "Mercado Negro", path: "/market" },
    { icon: "🏦", label: "Banco", path: "/bank" },
    { icon: "🏢", label: "Empresas", path: "/business" },
  ];

  const socialMenuItems = [
    { icon: "🏴", label: "Clãs", path: "/clans" },
    { icon: "🏆", label: "Ranking", path: "/ranking" },
    { icon: "🏛️", label: "Praça", path: "/square" },
    { icon: "💪", label: "Academia", path: "/gym" },
    { icon: "👤", label: "Perfil", path: "/profile" },
  ];

  const premiumMenuItems = [
    { icon: "💎", label: "Assinatura VIP", path: "/vip" },
    { icon: "🛍️", label: "Loja Premium", path: "/store" },
  ];

  return (
    <div
      className={`${isCompact ? "w-20" : "w-64"} ${themeClasses.sidebarBg} h-screen fixed left-0 top-0 z-10 ${themeClasses.shadow} transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="p-4 mb-1">
        {isCompact ? (
          <div className="text-center space-y-2">
            {/* Ícones de navegação */}
            <div className="flex flex-col space-y-1">
              <button
                className={`w-8 h-8 ${themeClasses.text} hover:text-red-400 rounded transition-colors text-sm flex items-center justify-center ${
                  currentPath === "/dashboard" ? "text-red-400" : ""
                }`}
                onClick={() => navigateTo("/dashboard")}
                title="Dashboard"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </button>
              <button
                className={`w-8 h-8 ${themeClasses.text} hover:text-red-400 rounded transition-colors text-sm flex items-center justify-center ${
                  currentPath === "/" ? "text-red-400" : ""
                }`}
                onClick={() => navigateTo("/")}
                title="Sair"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <h1 className="font-orbitron font-bold text-lg sm:text-xl leading-tight tracking-wide">
              <div className="flex justify-center items-center space-x-1">
                <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text">
                  URBAN
                </span>
                <span className="text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text">
                  CLASH
                </span>
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text">
                  TEAM
                </span>
              </div>
            </h1>
            {/* Ícones de navegação */}
            <div className="flex justify-center space-x-2">
              <button
                className={`w-8 h-8 ${themeClasses.text} hover:text-red-400 rounded transition-colors text-sm flex items-center justify-center ${
                  currentPath === "/dashboard" ? "text-red-400" : ""
                }`}
                onClick={() => navigateTo("/dashboard")}
                title="Dashboard"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </button>
              <button
                className={`w-8 h-8 ${themeClasses.text} hover:text-red-400 rounded transition-colors text-sm flex items-center justify-center ${
                  currentPath === "/" ? "text-red-400" : ""
                }`}
                onClick={() => navigateTo("/")}
                title="Sair"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Informações do Usuário */}
      <div
        className={`mx-2 mb-2 p-2 ${themeClasses.cardBg} rounded-lg ${themeClasses.shadow}`}
      >
        {isCompact ? (
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
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-red-400">ATK</span>
                <span className="font-bold">
                  {formatValue(combatStats?.attack || userProfile?.attack || 0)}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-blue-400">DEF</span>
                <span className="font-bold">
                  {formatValue(
                    combatStats?.defense || userProfile?.defense || 0,
                  )}
                </span>
              </div>
              <div className={`${themeClasses.text} flex justify-between`}>
                <span className="text-purple-400">FOC</span>
                <span className="font-bold">
                  {formatValue(combatStats?.focus || userProfile?.focus || 0)}
                </span>
              </div>
              <div
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={getCriticalChanceExplanation(userProfile?.focus || 0)}
              >
                <span className="text-cyan-400">CH.C</span>
                <span className="font-bold">
                  {formatValue(
                    combatStats?.criticalChance ||
                      userProfile?.critical_chance ||
                      0,
                  )}
                  %
                </span>
              </div>
              <div
                className={`${themeClasses.text} flex justify-between cursor-help hover:bg-gray-700/30 rounded transition-colors`}
                title={getCriticalDamageExplanation(
                  userProfile?.attack || 0,
                  userProfile?.focus || 0,
                )}
              >
                <span className="text-pink-400">DA.C</span>
                <span className="font-bold">
                  {formatValue(combatStats?.criticalDamage || 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <UserInfoCard
            userProfile={userProfile}
            combatStats={combatStats}
            themeClasses={themeClasses}
            compact={true}
          />
        )}
      </div>

      {/* Navigation Items */}
      <nav
        className={`${isCompact ? "px-2" : "px-4"} flex-1 overflow-y-auto custom-scrollbar pb-4`}
      >
        <ul className="space-y-2">
          {/* Menus - ocultos no modo compacto */}
          {!isCompact && (
            <>
              {/* Menu: Jogo */}
              <li className="mt-4">
                <SidebarMenu
                  title="Jogo"
                  icon="🎮"
                  items={gameMenuItems}
                  isOpen={openMenus.jogo}
                  isCompact={isCompact}
                  themeClasses={themeClasses}
                  onToggle={() => toggleMenu("jogo")}
                  onNavigate={navigateTo}
                  activeItem={currentPath}
                  onItemClick={() => keepMenuOpen("jogo")}
                />
              </li>

              {/* Menu: Atividades */}
              <li className="mt-2">
                <SidebarMenu
                  title="Atividades"
                  icon="🎯"
                  items={activitiesMenuItems}
                  isOpen={openMenus.atividades}
                  isCompact={isCompact}
                  themeClasses={themeClasses}
                  onToggle={() => toggleMenu("atividades")}
                  onNavigate={navigateTo}
                  activeItem={currentPath}
                  onItemClick={() => keepMenuOpen("atividades")}
                />
              </li>

              {/* Menu: Social */}
              <li className="mt-2">
                <SidebarMenu
                  title="Social"
                  icon="👥"
                  items={socialMenuItems}
                  isOpen={openMenus.social}
                  isCompact={isCompact}
                  themeClasses={themeClasses}
                  onToggle={() => toggleMenu("social")}
                  onNavigate={navigateTo}
                  activeItem={currentPath}
                  onItemClick={() => keepMenuOpen("social")}
                />
              </li>

              {/* Menu: Premium */}
              <li className="mt-2">
                <SidebarMenu
                  title="Premium"
                  icon="💎"
                  items={premiumMenuItems}
                  isOpen={openMenus.premium}
                  isCompact={isCompact}
                  themeClasses={themeClasses}
                  onToggle={() => toggleMenu("premium")}
                  onNavigate={navigateTo}
                  activeItem={currentPath}
                  onItemClick={() => keepMenuOpen("premium")}
                />
              </li>
            </>
          )}

          {/* Navegação direta no modo compacto */}
          {isCompact && (
            <>
              {/* Botões de navegação rápida */}
              <li className="mt-4">
                <div className="space-y-1">
                  {/* Jogo */}
                  {gameMenuItems.map((item, index) => {
                    const isGangster = userProfile?.faction === "gangsters";
                    const hoverColor = isGangster
                      ? "hover:bg-orange-500"
                      : "hover:bg-blue-500";
                    const activeColor = isGangster
                      ? "bg-orange-500"
                      : "bg-blue-500";
                    const ringColor = isGangster
                      ? "ring-orange-400"
                      : "ring-blue-400";

                    return (
                      <button
                        key={index}
                        className={`w-full ${themeClasses.text} ${hoverColor} hover:bg-opacity-30 font-orbitron py-2 px-2 rounded transition-colors text-center text-sm ${
                          currentPath === item.path
                            ? `${activeColor} bg-opacity-30 ring-2 ${ringColor}`
                            : ""
                        }`}
                        onClick={() => navigateTo(item.path)}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    );
                  })}

                  {/* Atividades */}
                  {activitiesMenuItems.map((item, index) => {
                    const isGangster = userProfile?.faction === "gangsters";
                    const hoverColor = isGangster
                      ? "hover:bg-orange-500"
                      : "hover:bg-blue-500";
                    const activeColor = isGangster
                      ? "bg-orange-500"
                      : "bg-blue-500";
                    const ringColor = isGangster
                      ? "ring-orange-400"
                      : "ring-blue-400";

                    return (
                      <button
                        key={index}
                        className={`w-full ${themeClasses.text} ${hoverColor} hover:bg-opacity-30 font-orbitron py-2 px-2 rounded transition-colors text-center text-sm ${
                          currentPath === item.path
                            ? `${activeColor} bg-opacity-30 ring-2 ${ringColor}`
                            : ""
                        }`}
                        onClick={() => navigateTo(item.path)}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    );
                  })}

                  {/* Social */}
                  {socialMenuItems.map((item, index) => {
                    const isGangster = userProfile?.faction === "gangsters";
                    const hoverColor = isGangster
                      ? "hover:bg-orange-500"
                      : "hover:bg-blue-500";
                    const activeColor = isGangster
                      ? "bg-orange-500"
                      : "bg-blue-500";
                    const ringColor = isGangster
                      ? "ring-orange-400"
                      : "ring-blue-400";

                    return (
                      <button
                        key={index}
                        className={`w-full ${themeClasses.text} ${hoverColor} hover:bg-opacity-30 font-orbitron py-2 px-2 rounded transition-colors text-center text-sm ${
                          currentPath === item.path
                            ? `${activeColor} bg-opacity-30 ring-2 ${ringColor}`
                            : ""
                        }`}
                        onClick={() => navigateTo(item.path)}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    );
                  })}

                  {/* Premium */}
                  {premiumMenuItems.map((item, index) => {
                    const isGangster = userProfile?.faction === "gangsters";
                    const hoverColor = isGangster
                      ? "hover:bg-orange-500"
                      : "hover:bg-blue-500";
                    const activeColor = isGangster
                      ? "bg-orange-500"
                      : "bg-blue-500";
                    const ringColor = isGangster
                      ? "ring-orange-400"
                      : "ring-blue-400";

                    return (
                      <button
                        key={index}
                        className={`w-full ${themeClasses.text} ${hoverColor} hover:bg-opacity-30 font-orbitron py-2 px-2 rounded transition-colors text-center text-sm ${
                          currentPath === item.path
                            ? `${activeColor} bg-opacity-30 ring-2 ${ringColor}`
                            : ""
                        }`}
                        onClick={() => navigateTo(item.path)}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    );
                  })}
                </div>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
};
