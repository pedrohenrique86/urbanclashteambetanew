import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile } from "../../types";
import { calculateCombatStats } from "../../utils/combat";

interface TopBarProps {
  userProfile: UserProfile | null;
  handleLogout: () => void;
  onMenuToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  userProfile,
  handleLogout,
  onMenuToggle,
}) => {
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

  const metrics = [
    {
      label: "Nível",
      value: userProfile?.level ?? "-",
      className: "text-green-400",
      glowColor: "#22c55e",
    },
    {
      label: "XP",
      value: xpText,
      className: "text-purple-400",
      glowColor: "#a855f7",
    },
    {
      label: "Energia",
      value: energyText,
      className: "text-orange-400",
      glowColor: "#f97316",
    },
    {
      label: "Ações",
      value: userProfile?.action_points ?? "-",
      className: "text-cyan-400",
      glowColor: "#06b6d4",
    },
    {
      label: "Ataque",
      value: userProfile?.attack ?? "-",
      className: "text-red-400",
      glowColor: "#ef4444",
    },
    {
      label: "Defesa",
      value: userProfile?.defense ?? "-",
      className: "text-blue-400",
      glowColor: "#3b82f6",
    },
    {
      label: "Foco",
      value: userProfile?.focus ?? "-",
      className: "text-pink-400",
      glowColor: "#ec4899",
    },
    {
      label: "Crítico",
      value: `${combat.criticalChance?.toFixed?.(0) ?? 0}%`,
      className: "text-yellow-400",
      glowColor: "#eab308",
    },
    {
      label: "Dano Crítico",
      value: combat.criticalDamage?.toFixed?.(1) ?? "-",
      className: "text-rose-400",
      glowColor: "#f43f5e",
    },
    {
      label: "Cash",
      value: `$${(userProfile?.money ?? 0).toLocaleString("pt-BR")}`,
      className: "text-lime-400",
      glowColor: "#84cc16",
    },
  ];

  return (
    <div
      className={`relative w-full ${themeClasses.cardBg} border ${themeClasses.border} bg-opacity-70 backdrop-blur-lg rounded-xl p-2 md:p-3 mb-6`}
    >
      <div className="w-full flex flex-col md:flex-row items-center">
        {/* Top part on mobile, left part on desktop */}
        <div className="flex items-center justify-between w-full md:w-auto shrink-0 h-12 px-2 md:px-0">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Toggle */}
            <button
              onClick={onMenuToggle}
              className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
              title="Menu"
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
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
          </div>

          {/* User info and mobile logout */}
          <div className="flex items-center gap-3">
            {/* Mobile Logout Icon */}
            <div className="md:hidden"></div>
          </div>
        </div>

        {/* Metrics container */}
        <div className="w-full flex-1 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 pb-2 md:pb-0">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center text-center"
            >
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                {metric.label}
              </span>
              <span
                className={`font-orbitron font-bold text-sm sm:text-base ${metric.className}`}
                style={{
                  textShadow: `0 0 3px ${metric.glowColor}, 0 0 6px ${metric.glowColor}`,
                }}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* Desktop Logout Button */}
        <div className="hidden md:flex items-center ml-auto pl-4"></div>
      </div>
    </div>
  );
};

export default TopBar;