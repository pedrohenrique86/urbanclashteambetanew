import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile } from "../../types";
import { calculateCombatStats } from "../../utils/combat";

interface TopBarProps {
  userProfile: UserProfile | null;
  handleLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ userProfile, handleLogout }) => {
  const { themeClasses } = useTheme();
  const usernameGradient =
    userProfile?.faction === "gangsters"
      ? "from-orange-300 to-orange-600"
      : "from-blue-300 to-blue-600";
  const xpRequired = userProfile?.xp_required ?? 0;
  const xpCurrent = userProfile?.current_xp ?? 0;
  const xpText = xpRequired > 0 ? `${xpCurrent}/${xpRequired}` : `${xpCurrent}`;
  const energyText = userProfile?.max_energy
    ? `${userProfile?.energy ?? 0}/${userProfile?.max_energy}`
    : `${userProfile?.energy ?? 0}`;
  const combat = calculateCombatStats(userProfile);
  const metricPills = [
    {
      key: "LVL",
      fullLabel: "Nível",
      shortLabel: "LVL",
      value: userProfile?.level ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-green-500 to-emerald-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2l2 4 4 1-3 3 .7 4L10 12l-3.7 2 1-4-3-3 4-1 2-4z" />
        </svg>
      ),
    },
    {
      key: "XP",
      fullLabel: "XP",
      shortLabel: "XP",
      value: xpText,
      size: "lg",
      color: "bg-gradient-to-r from-purple-500 to-fuchsia-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2l2.39 4.84L18 8l-4 3.9L15 18l-5-2.6L5 18l1-6.1L2 8l5.61-1.16L10 2z" />
        </svg>
      ),
    },
    {
      key: "EN",
      fullLabel: "Energia",
      shortLabel: "EN",
      value: energyText,
      size: "lg",
      color: "bg-gradient-to-r from-amber-500 to-orange-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 1L3 10h5l-1 9 8-9h-5l1-9z" />
        </svg>
      ),
    },
    {
      key: "PA",
      fullLabel: "Pontos de Ação",
      shortLabel: "PA",
      value: userProfile?.action_points ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-teal-500 to-cyan-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
        </svg>
      ),
    },
    {
      key: "ATK",
      fullLabel: "Ataque",
      shortLabel: "ATK",
      value: userProfile?.attack ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-red-500 to-rose-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 12l8-8 6 6-8 8H2v-6z" />
        </svg>
      ),
    },
    {
      key: "DEF",
      fullLabel: "Defesa",
      shortLabel: "DEF",
      value: userProfile?.defense ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-blue-500 to-indigo-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2l6 3v5c0 5-3.5 7.5-6 8-2.5-.5-6-3-6-8V5l6-3z" />
        </svg>
      ),
    },
    {
      key: "FOC",
      fullLabel: "Foco",
      shortLabel: "FOC",
      value: userProfile?.focus ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-pink-500 to-rose-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 4a6 6 0 100 12A6 6 0 0010 4zm0-3a9 9 0 110 18A9 9 0 0110 1z" />
        </svg>
      ),
    },
    {
      key: "CRIT%",
      fullLabel: "Chance Crítica",
      shortLabel: "CRIT%",
      value: `${combat.criticalChance?.toFixed?.(0) ?? 0}%`,
      size: "lg",
      color: "bg-gradient-to-r from-pink-600 to-rose-700",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3l6 6-8 8-6-6 8-8z" />
        </svg>
      ),
    },
    {
      key: "CRIT DMG",
      fullLabel: "Dano Crítico",
      shortLabel: "CRIT DMG",
      value: combat.criticalDamage?.toFixed?.(1) ?? "-",
      size: "lg",
      color: "bg-gradient-to-r from-fuchsia-600 to-purple-700",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 11l5-9 2 6h7l-5 9-2-6H3z" />
        </svg>
      ),
    },
    {
      key: "DINHEIRO",
      fullLabel: "Dinheiro",
      shortLabel: "$",
      value: (userProfile?.money ?? 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      size: "lg",
      color: "bg-gradient-to-r from-lime-400 to-emerald-600",
      textClass: "text-black",
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2C6 2 3 4 3 7v6c0 3 3 5 7 5s7-2 7-5V7c0-3-3-5-7-5z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 ${themeClasses.cardBg} border-b ${themeClasses.border} bg-opacity-90 backdrop-blur-md`}
      >
        <div className="w-full px-1 md:px-3 lg:px-4">
          <div className="w-full flex flex-col md:flex-row items-center md:h-12">
            {/* Top part on mobile, left part on desktop */}
            <div className="flex items-center justify-between w-full md:w-auto shrink-0 h-12 px-2 md:px-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-orbitron whitespace-nowrap">
                  <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                    URBAN
                  </span>
                  <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                    CLASH
                  </span>
                </span>
              </div>
              {/* User info and mobile logout */}
              <div className="flex items-center gap-3">
                <span
                  className={`font-orbitron font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${usernameGradient} text-[12px] sm:text-sm whitespace-nowrap`}
                >
                  {userProfile?.username || "Usuário"}
                </span>
                {/* Mobile Logout Icon */}
                <div className="md:hidden">
                  <button
                    onClick={handleLogout}
                    className="text-cyan-400 transition-all duration-300 ease-in-out hover:text-cyan-300"
                    title="Sair"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics container - allows wrapping */}
            <div className="w-full flex-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pb-2 md:pb-0">
              {metricPills.map((p) => (
                <div
                  key={p.key}
                  className={`flex flex-shrink-0 items-center rounded-md shadow ${p.color} px-2 py-0.5 ${p.textClass} font-bold text-xs`}
                  title={p.fullLabel}
                >
                  {p.icon}
                  <span className="ml-1">{p.shortLabel}</span>
                  <span className="ml-1.5">{p.value}</span>
                </div>
              ))}
            </div>

            {/* Desktop Logout Button */}
            <div className="hidden md:flex items-center ml-auto pr-2">
              <button
                onClick={handleLogout}
                className="font-orbitron text-sm font-bold text-cyan-400 transition-all duration-300 ease-in-out hover:text-cyan-300 hover:shadow-[0_0_15px_#06b6d4] shadow-[0_0_5px_#06b6d4,0_0_10px_#06b6d4] px-3 py-1 rounded-md"
                title="Sair"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TopBar;
