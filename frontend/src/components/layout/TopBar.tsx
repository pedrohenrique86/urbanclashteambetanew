import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile } from "../../types";
import { Tooltip } from "react-tooltip";
import { calculateCombatStats } from "../../utils/combat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../../utils/faction";

interface TopBarProps {
  userProfile: UserProfile | null;
}

const TopBar: React.FC<TopBarProps> = ({ userProfile }) => {
  const { themeClasses } = useTheme();

  const userFaction = useMemo(() => {
    if (!userProfile) return null;
    const rawF = typeof userProfile.faction === 'string' 
      ? userProfile.faction 
      : (userProfile.faction as any)?.name;
    return FACTION_ALIAS_MAP_FRONTEND[String(rawF).toLowerCase().trim()] || "gangsters";
  }, [userProfile]);

  const usernameGradient = useMemo(() => 
    userFaction === "gangsters"
      ? "from-orange-300 to-orange-600"
      : "from-blue-300 to-blue-600"
  , [userFaction]);

  const xpRequired = userProfile?.xp_required ?? 0;
  const xpCurrent = userProfile?.current_xp ?? 0;
  const xpText = xpRequired > 0 ? `${xpCurrent}/${xpRequired}` : `${xpCurrent}`;

  const energyText = userProfile?.max_energy
    ? `${userProfile?.energy ?? 0}/${userProfile?.max_energy}`
    : `${userProfile?.energy ?? 0}`;

  const combat = useMemo(() => calculateCombatStats(userProfile), [userProfile]);

  const metrics = useMemo(() => [
    { label: "NVL", value: userProfile?.level ?? "-", className: "text-green-400", glowColor: "#22c55e", tooltip: "Nível" },
    { label: "XP", value: xpText, className: "text-purple-400", glowColor: "#a855f7", tooltip: "Experiência" },
    { label: "EN", value: energyText, className: "text-orange-400", glowColor: "#f97316", tooltip: "Energia" },
    { label: "PA", value: userProfile?.action_points ?? "-", className: "text-cyan-400", glowColor: "#06b6d4", tooltip: "Pontos de Ação" },
    { label: "ATK", value: userProfile?.attack ?? "-", className: "text-red-400", glowColor: "#ef4444", tooltip: "Ataque" },
    { label: "DEF", value: userProfile?.defense ?? "-", className: "text-blue-400", glowColor: "#3b82f6", tooltip: "Defesa" },
    { label: "FOC", value: userProfile?.focus ?? "-", className: "text-pink-400", glowColor: "#ec4899", tooltip: "Foco" },
    { label: "CRIT DMG", value: combat.criticalDamage?.toFixed?.(1) ?? "-", className: "text-rose-400", glowColor: "#f43f5e", tooltip: "Dano Crítico" },
    { label: "CRIT%", value: `${combat.criticalChance?.toFixed?.(0) ?? 0}%`, className: "text-yellow-400", glowColor: "#eab308", tooltip: "Chance Crítico" },
    { label: "Cash", value: `$${(userProfile?.money ?? 0).toLocaleString("pt-BR")}`, className: "text-lime-400", glowColor: "#84cc16", tooltip: "Dinheiro" },
  ], [userProfile, xpText, energyText, combat]);

  // Se o perfil do usuário ainda não foi carregado, não renderiza nada no JSX.
  if (!userProfile) {
    return null;
  }

  return (
    <>
      <div className="absolute top-[12px] md:top-[6px] z-50 w-full flex justify-center items-start md:items-center mb-6 h-auto">
        {/* The compact, centered metrics card */}
        <div
          className="relative bg-black/20 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-4 sm:px-6 py-2 shadow-lg w-[90%] md:w-auto"
          style={{
            boxShadow:
              "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 0 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4">
            {metrics.map((metric, index) => (
              <React.Fragment key={metric.label}>
                <div
                  className="flex flex-col items-center text-center"
                  data-tooltip-id="topbar-tooltip"
                  data-tooltip-content={metric.tooltip}
                >
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
      <Tooltip
        id="topbar-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-xs !font-sans"
      />
    </>
  );
};

export default TopBar;