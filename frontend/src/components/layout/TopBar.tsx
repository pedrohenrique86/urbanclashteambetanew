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
      label: "NVL",
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
      label: "EN",
      value: energyText,
      className: "text-orange-400",
      glowColor: "#f97316",
    },
    {
      label: "PA",
      value: userProfile?.action_points ?? "-",
      className: "text-cyan-400",
      glowColor: "#06b6d4",
    },
    {
      label: "ATK",
      value: userProfile?.attack ?? "-",
      className: "text-red-400",
      glowColor: "#ef4444",
    },
    {
      label: "DEF",
      value: userProfile?.defense ?? "-",
      className: "text-blue-400",
      glowColor: "#3b82f6",
    },
    {
      label: "FOC",
      value: userProfile?.focus ?? "-",
      className: "text-pink-400",
      glowColor: "#ec4899",
    },
    {
      label: "CRIT%",
      value: `${combat.criticalChance?.toFixed?.(0) ?? 0}%`,
      className: "text-yellow-400",
      glowColor: "#eab308",
    },
    {
      label: "CRIT DMG",
      value: combat.criticalDamage?.toFixed?.(1) ?? "-",
      className: "text-rose-400",
      glowColor: "#f43f5e",
    },
    {
      label: "Cash",
      value: `${(userProfile?.money ?? 0).toLocaleString("pt-BR")}`,
      className: "text-lime-400",
      glowColor: "#84cc16",
    },
  ];

  return (
    <div className="absolute top-[6px] z-50 w-full flex justify-center items-center mb-6 h-10 md:h-auto">
      {/* Mobile Menu Toggle - Positioned to the left */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2">
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

      {/* The compact, centered metrics card */}
      <div
        className="relative bg-black/20 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-2 shadow-lg"
        style={{
          boxShadow:
            "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4">
          {metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs text-white font-medium uppercase tracking-wider">
                  {metric.label}
                </span>
                <span
                  className={`font-orbitron font-bold text-sm ${metric.className}`}
                  style={{
                    textShadow: `0 0 3px ${metric.glowColor}, 0 0 6px ${metric.glowColor}`,
                  }}
                >
                  {metric.value}
                </span>
              </div>
              {index === 0 && (
                <div className="flex items-center self-stretch">
                  <span className="text-slate-600">|</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopBar;