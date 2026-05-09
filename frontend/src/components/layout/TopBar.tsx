import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile } from "../../contexts/UserProfileContext";
import { Tooltip } from "react-tooltip";
import { motion } from "framer-motion";
import LiveNewsTicker from "./LiveNewsTicker";
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

  const xpRequired = userProfile?.xp_required ?? 0;
  const xpCurrent = userProfile?.current_xp ?? 0;
  const xpPercentage = xpRequired > 0 ? Math.min(100, (xpCurrent / xpRequired) * 100) : 0;
  const xpText = xpRequired > 0 ? `${xpCurrent}/${xpRequired}` : `${xpCurrent}`;

  const energyCurrent = Math.floor(userProfile?.energy ?? 0);
  const energyMax = Math.floor(userProfile?.max_energy ?? 100);
  const energyPercentage = Math.min(100, (energyCurrent / energyMax) * 100);
  const energyText = `${Math.floor(energyPercentage)}%`;

  const combat = useMemo(() => calculateCombatStats(userProfile), [userProfile]);
  
  const currentToxicity = userProfile?.toxicity ?? 0;
  const toxicityPercentage = Math.min(100, currentToxicity);

  // ── Cálculo ao vivo das parcelas do Nível Dinâmico ──────────────────────────
  const levelBreakdown = useMemo(() => {
    const atk  = Number(userProfile?.attack  ?? 0);
    const def  = Number(userProfile?.defense ?? 0);
    const foc  = Number(userProfile?.focus   ?? 0);
    const money = Number(userProfile?.money  ?? 0);
    const totalXp = Number(userProfile?.xp ?? 0);

    // XP-level (idêntico ao calculateLevelFromXp do backend)
    let xpLvl = 1, rem = totalXp;
    while (rem >= 100 + Math.floor(xpLvl / 5) * 10 && xpLvl < 5000) {
      rem -= 100 + Math.floor(xpLvl / 5) * 10; xpLvl++;
    }

    const totalStats = atk + def + foc;
    const statsBonus = Math.floor(totalStats / 25);
    const moneyBonus = Math.floor(money / 10_000);

    return { xpLvl, statsBonus, moneyBonus, totalStats, money };
  }, [userProfile]);

  const formatCurrency = (n: number): string => {
    if (!isFinite(n) || isNaN(n)) return "0";

    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";

    // Formata com 1 casa decimal em pt-BR (vírgula) e remove ",0" desnecessário
    const fmt = (val: number, divisor: number, suffix: string): string => {
      const divided = val / divisor;
      // Arredonda para 1 casa — se ficar >= 1000 sobe de nível automaticamente
      const rounded = Math.round(divided * 10) / 10;
      const formatted = rounded
        .toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      return `${sign}${formatted}${suffix}`;
    };

    if (abs < 10_000)          return `${sign}${abs.toLocaleString("pt-BR")}`;
    if (abs < 1_000_000)       return fmt(abs, 1_000,           "k");
    if (abs < 1_000_000_000)   return fmt(abs, 1_000_000,       "M");
    if (abs < 1_000_000_000_000) return fmt(abs, 1_000_000_000, "B");
    return                            fmt(abs, 1_000_000_000_000, "T");
  };

  const metrics = useMemo(() => [
    { 
      label: "NVL",
      value: userProfile ? (levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus) : "-",
      className: "text-green-400",
      glowColor: "#22c55e",
      tooltip: "Nível",
      tooltipId: "topbar-level-tooltip",
      showHint: true,
    },
    { 
      label: "XP", 
      value: xpText, 
      className: "text-purple-400", 
      glowColor: "#a855f7", 
      tooltipId: "topbar-xp-tooltip",
      showHint: true,
      progress: xpPercentage,
      barColor: "bg-purple-500/50",
      isBattery: true
    },
    { 
      label: "EN", 
      value: energyText, 
      className: "text-orange-400", 
      glowColor: "#f97316", 
      tooltip: "Energia (Gerada 1% a cada 3 minutos auto)",
      progress: energyPercentage,
      barColor: "bg-orange-500/50",
      isBattery: true
    },
    { label: "PA",       value: userProfile?.action_points ?? "-",                         className: "text-cyan-400",    glowColor: "#06b6d4", tooltip: "Pontos de Ação:20.000 reset diário 00:00h" },
    { label: "ATK",      value: userProfile?.attack !== undefined ? Number(userProfile.attack).toFixed(2) : "-", className: "text-red-400", glowColor: "#ef4444", tooltip: "ATAQUE" },
    { label: "DEF",      value: userProfile?.defense !== undefined ? Number(userProfile.defense).toFixed(2) : "-", className: "text-blue-400", glowColor: "#3b82f6", tooltip: "DEFESA" },
    { label: "FOC",      value: userProfile?.focus !== undefined ? Number(userProfile.focus).toFixed(2) : "-", className: "text-pink-400", glowColor: "#ec4899", tooltip: "FOCO" },
    { label: "CRIT DMG", value: combat.criticalDamage ? Number(combat.criticalDamage.toFixed(2)) : "-", className: "text-rose-400",    glowColor: "#f43f5e", tooltipId: "topbar-crit-dmg-tooltip", showHint: true },
    { label: "CRIT%",    value: `${combat.criticalChance ? Number(combat.criticalChance.toFixed(2)) : 0}%`, className: "text-yellow-400",  glowColor: "#eab308", tooltipId: "topbar-crit-pct-tooltip", showHint: true },
    { label: "LUCK",     value: `${Number(userProfile?.luck ?? 0).toFixed(1)}%`,          className: "text-emerald-400", glowColor: "#34d399", tooltip: `Sorte (Bônus de Loot): ${Number(userProfile?.luck || 0).toFixed(2)}%` },
    { 
      label: "Cash", 
      value: `$${formatCurrency(userProfile?.money ?? 0)}`, 
      className: "text-lime-400", 
      glowColor: "#84cc16", 
      tooltip: `$${(userProfile?.money ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
    },
    { 
      label: "UC", 
      value: formatCurrency(userProfile?.ucrypto ?? 0), 
      className: "text-amber-400 font-black", 
      glowColor: "#f59e0b", 
      tooltip: "U-CRYPTON TOKENS"
    },
  ], [userProfile, xpText, energyText, xpPercentage, energyPercentage, combat, levelBreakdown]);

  if (!userProfile) return null;

  return (
    <>
      <div className="w-full flex flex-col items-center pt-2 md:pt-3 pb-0 pointer-events-none">
        <div className="flex flex-col items-center w-[95%] md:w-fit">
          <div
            className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl w-full md:w-auto pointer-events-auto"
            style={{
              boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 20px 50px rgba(0, 0, 0, 0.9)",
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
              {metrics.map((metric, index) => (
                <React.Fragment key={metric.label}>
                  <div className="flex flex-col items-center justify-center text-center px-1">
                    <span
                      className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1 cursor-default"
                    >
                      {metric.label}
                    </span>
                    <div className={`relative ${metric.label === 'NVL' && userProfile?.status ? 'pl-4 pr-3' : 'px-3'} py-1 rounded-lg overflow-hidden flex items-center justify-center gap-1 ${metric.progress !== undefined ? 'bg-white/5 w-[65px] sm:w-[75px]' : 'min-w-[50px]'} ${(metric as any).isBattery ? 'pr-4 !rounded-md' : ''}`}>
                      {metric.progress !== undefined && (
                        <motion.div
                          initial={false}
                          animate={{ width: `${metric.progress}%` }}
                          transition={{ type: "spring", stiffness: 40, damping: 12 }}
                          className={`absolute inset-0 left-0 right-auto h-full ${(metric as any).barColor} z-0 shadow-[inset_-1px_0_6px_rgba(255,255,255,0.1)]`}
                        />
                      )}
                      {(metric.label === "NVL" || index === metrics.length - 1) && userProfile?.status && (
                        <div
                          className={`absolute ${index === 0 ? 'left-0' : 'right-0'} top-0 bottom-0 w-1.5 z-20 animate-status-pulse ${
                            userProfile.status === 'Ruptura' ? 'bg-red-500 text-red-500/50' :
                            userProfile.status === 'Isolamento' ? 'bg-zinc-400 text-zinc-400/50' :
                            userProfile.status === 'Recondicionamento' ? 'bg-amber-400 text-amber-400/50' :
                            userProfile.status === 'Aprimoramento' ? 'bg-blue-500 text-blue-500/50' :
                            'bg-emerald-500 text-emerald-500/50'
                          }`}
                          data-tooltip-id="topbar-tooltip"
                          data-tooltip-content={userProfile.status}
                        />
                      )}
                      {metric.label === "EN" && (
                        <div 
                          className="absolute bottom-0 left-0 w-full h-[2px] bg-black/40 z-20 overflow-hidden"
                          data-tooltip-id="topbar-tooltip"
                          data-tooltip-content="Toxicidade"
                        >
                          <motion.div
                            initial={false}
                            animate={{ width: `${toxicityPercentage}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 12 }}
                            className={`h-full transition-colors duration-500 ${
                              toxicityPercentage >= 91 
                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                                : toxicityPercentage >= 85 
                                  ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' 
                                  : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                            }`}
                          />
                        </div>
                      )}
                      <span
                        className={`relative z-10 font-orbitron font-black text-[10px] sm:text-xs ${metric.className} leading-none whitespace-nowrap`}
                        style={{ textShadow: `0 0 10px ${metric.glowColor}` }}
                        data-tooltip-id={metric.tooltipId ?? "topbar-tooltip"}
                        data-tooltip-content={metric.tooltipId ? undefined : metric.tooltip}
                      >
                        {metric.value}
                      </span>
                      {(metric as any).isBattery && (
                         <div className="absolute right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[6px] bg-white/20 rounded-r-[1px] z-20" />
                      )}
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <LiveNewsTicker />
        </div>
      </div>

      <Tooltip
        id="topbar-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-black/95 !backdrop-blur-xl !text-white !rounded-xl !px-4 !py-2 !text-[10px] !border !border-white/10 !shadow-2xl font-orbitron uppercase tracking-widest"
      />

      <Tooltip
        id="topbar-crit-pct-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-slate-900/98 !backdrop-blur-2xl !rounded-2xl !border !border-yellow-500/40 !shadow-[0_0_30px_rgba(0,0,0,0.8)] !p-0 !max-w-[320px] !opacity-100"
        render={() => (
           <div className="p-4 space-y-3 font-orbitron text-[11px]">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                 <span className="text-yellow-400 font-black text-xs tracking-widest uppercase">Chance Crítica</span>
                 <span className="text-[9px] text-zinc-500 font-bold uppercase italic border border-white/10 px-1 rounded bg-black/20">Limite Máximo: 60%</span>
              </div>
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                 <div className="flex flex-col gap-2.5 text-[10px] opacity-90 font-mono">
                    <div className="flex justify-between items-center text-zinc-300">
                       <span>Base Fixa</span>
                       <span className="font-bold">5.0%</span>
                    </div>
                    <div className="flex justify-between items-center text-pink-400">
                       <span>
                          Bônus de Foco
                          <span className="block text-[8px] opacity-60 mt-0.5">({userProfile?.focus || 0} pts × 0.08%)</span>
                       </span>
                       <span className="font-bold">+{Number((userProfile?.focus || 0) * 0.08).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-yellow-400">
                       <span>
                          Treinos Acumulados
                          <span className="block text-[8px] opacity-60 mt-0.5">(pontos brutos de treino × 1%)</span>
                       </span>
                       <span className="font-bold">+{Number(userProfile?.critical_chance ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center text-white">
                       <span className="text-[9px] uppercase tracking-wider">Total (cap 60%)</span>
                       <span className="font-black">{Math.min(60, 5 + (userProfile?.focus || 0) * 0.08 + (userProfile?.critical_chance || 0)).toFixed(2)}%</span>
                    </div>
                 </div>
              </div>
           </div>
        )}
      />

      <Tooltip
        id="topbar-crit-dmg-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-slate-900/98 !backdrop-blur-2xl !rounded-2xl !border !border-rose-500/40 !shadow-[0_0_30px_rgba(0,0,0,0.8)] !p-0 !max-w-[320px] !opacity-100"
        render={() => {
           const isRenegado = userFaction === 'gangsters';
           const baseFaction = isRenegado ? 150 : 130;
           const atk = Number(userProfile?.attack || 0);
           const def = Number(userProfile?.defense || 0);
           const foc = Number(userProfile?.focus || 0);
           const sumStats = atk + def + foc;
           const statsBonus = Math.floor(sumStats / 50);
           return (
              <div className="p-4 space-y-3 font-orbitron text-[11px]">
                 <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <span className="text-rose-400 font-black text-xs tracking-widest uppercase">Dano Crítico</span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase italic border border-white/10 px-1 rounded bg-black/20">Limite Máximo: 4.0x</span>
                 </div>
                 <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <div className="flex flex-col gap-2.5 text-[10px] opacity-90 font-mono">
                       <div className="flex justify-between items-center text-zinc-300">
                          <span>Base da Facção</span>
                          <span className="font-bold">{baseFaction}% → +{(baseFaction/100).toFixed(2)}×</span>
                       </div>
                       <div className="flex justify-between items-center text-cyan-400">
                          <span>
                             Bônus de Treino
                             <span className="block text-[8px] opacity-60 mt-0.5">(ATK+DEF+FOC) ÷ 50 = {statsBonus} pontos</span>
                          </span>
                          <span className="font-bold">+{statsBonus}% → +{(statsBonus/100).toFixed(2)}×</span>
                       </div>
                       <div className="flex justify-between items-center text-rose-400">
                          <span>
                             Treinos Acumulados
                             <span className="block text-[8px] opacity-60 mt-0.5">(pontos brutos × 1%)</span>
                          </span>
                          <span className="font-bold">+{Number(userProfile?.critical_damage ?? 0).toFixed(1)}% → +{(Number(userProfile?.critical_damage ?? 0)/100).toFixed(2)}×</span>
                       </div>
                       <div className="border-t border-white/10 pt-2 flex justify-between items-center text-white">
                          <span className="text-[9px] uppercase tracking-wider">1 + (base+treino+acum) ÷ 100</span>
                          <span className="font-black">{Math.min(4.0, Math.round((1 + (baseFaction + statsBonus + Number(userProfile?.critical_damage ?? 0)) / 100) * 100) / 100).toFixed(2)}×</span>
                       </div>
                    </div>
                 </div>
              </div>
           );
        }}
      />

      <Tooltip
        id="topbar-level-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-slate-900/98 !backdrop-blur-2xl !rounded-2xl !border !border-green-500/40 !shadow-[0_0_30px_rgba(0,0,0,0.8)] !p-0 !max-w-[300px] !opacity-100"
        render={() => (
          <div className="p-5 space-y-4 font-orbitron text-[12px]">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-green-400 font-black text-sm tracking-widest uppercase">Nível</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Dinâmico</span>
            </div>
            <div className="space-y-2.5">
              <p className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-bold mb-3">Composição do Rank:</p>
              {/* XP Level */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-white/90 font-medium whitespace-nowrap">Nível Base (XP)</span>
                </div>
                <span className="text-purple-400 font-black text-sm">+{levelBreakdown.xpLvl}</span>
              </div>

              {/* Stats Bonus */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                  <span className="text-white/90 font-medium">
                    Bônus de Atributos
                    <span className="text-white/40 ml-1.5 text-[9px] font-mono">
                      ({Math.floor(levelBreakdown.totalStats)} pts / 25)
                    </span>
                  </span>
                </div>
                <span className="text-cyan-400 font-black text-sm">+{levelBreakdown.statsBonus}</span>
              </div>



              {/* Money Bonus */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0 shadow-[0_0_5px_rgba(163,230,53,0.5)]" />
                  <span className="text-white/90 font-medium">
                    Bônus de Riqueza
                    <span className="text-white/40 ml-1.5 text-[9px] font-mono">
                      (${(levelBreakdown.money).toLocaleString("pt-BR")} / 10k)
                    </span>
                  </span>
                </div>
                <span className="text-lime-400 font-black text-sm">+{levelBreakdown.moneyBonus}</span>
              </div>
            </div>

            {/* Divisor + Total */}
            <div className="border-t border-white/20 pt-3 flex items-center justify-between mt-2">
              <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Nível Final</span>
              <span
                className="text-green-400 font-black text-base tracking-widest"
                style={{ textShadow: "0 0 15px rgba(34,197,94,0.6)" }}
              >
                {(levelBreakdown.xpLvl + levelBreakdown.statsBonus + levelBreakdown.moneyBonus)}
              </span>
            </div>

            {/* Nota de rodapé explicativa (Resumo Tático) */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/5 mt-2">
              <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                <span className="text-green-400/80 font-black uppercase text-[8px] tracking-[0.2em] block mb-1.5">Análise de Balanço:</span>
                O divisor <span className="text-cyan-400 font-bold">25</span> nos atributos equilibra seu treino físico com o XP. Isso garante que sua maestria técnica e reputação monetária contribuam para o rank de forma justa, premiando o investimento em sua build.
              </p>
            </div>

          </div>
        )}
      />

      {/* Tooltip dedicado da Experiência (XP) */}
      <Tooltip
        id="topbar-xp-tooltip"
        place="bottom"
        style={{ zIndex: 9999 }}
        className="!bg-slate-900/98 !backdrop-blur-2xl !rounded-2xl !border !border-purple-500/40 !shadow-[0_0_30px_rgba(0,0,0,0.8)] !p-0 !max-w-[300px] !opacity-100"
        render={() => (
          <div className="p-4 space-y-3 font-orbitron text-[11px]">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
               <span className="text-purple-400 font-black text-xs tracking-widest uppercase">Experiência (XP)</span>
            </div>
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2">
               <p className="text-white/80 font-medium leading-relaxed">Concedida passivamente ao concluir treinamentos diários e operações de risco.</p>
               <div className="flex justify-between text-[10px] border-t border-white/5 pt-1.5 opacity-60 font-mono text-purple-300">
                  <span>Atual: {xpCurrent} / {xpRequired}</span>
                  <span>Total: {Number(userProfile?.xp ?? 0).toLocaleString("pt-BR")}</span>
               </div>
            </div>
            <p className="text-[9px] text-zinc-400 leading-relaxed italic border-l-2 border-white/10 pl-3 mt-2">O XP forma a base central vital da progressão na Faction, elevando o &apos;Nível Base&apos; do seu status militar antes de receber os cálculos de prestígio (riqueza & treino).</p>
          </div>
        )}
      />

    </>
  );
};

export default TopBar;