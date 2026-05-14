import React from "react";
import { Tooltip } from "react-tooltip";
import { useXPCalculations } from "../../hooks/useXPCalculations";

interface UserProfile {
  current_xp?: number;
  victories?: number;
  defeats?: number;
  level?: number;
  money?: number;
  money_daily_gain?: number;
  faction?: "gangsters" | "guardas";
  intimidation?: number;
  discipline?: number;
  winning_streak?: number;
  uCrypto?: number;
}

interface StatsCardsProps {
  userProfile: UserProfile | null;
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
  isDarkTheme: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  userProfile,
  themeClasses,
  isDarkTheme,
}) => {
  const xpCalculations = useXPCalculations(userProfile?.current_xp || 0);

  // Calcular a taxa de vitória usando dados do banco
  const winRate =
    (userProfile?.victories ?? 0) + (userProfile?.defeats ?? 0) > 0
      ? Math.round(
          ((userProfile?.victories ?? 0) /
            ((userProfile?.victories ?? 0) + (userProfile?.defeats ?? 0))) *
            100,
        )
      : 0;

  // Usar XP do banco de dados
  const totalXP = userProfile?.current_xp || 0;

  // Usar os cálculos corretos do hook
  const currentLevelXP = xpCalculations.currentLevelXP;
  const xpRequiredForLevel = xpCalculations.nextLevelXP + currentLevelXP; // XP total necessário para o nível atual
  const xpProgress =
    xpRequiredForLevel > 0
      ? Math.round((currentLevelXP / xpRequiredForLevel) * 100)
      : 0;

  const userFaction = typeof userProfile?.faction === 'string' 
    ? userProfile.faction 
    : (userProfile?.faction as any)?.name;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Level Card */}
      <div
        className={`${themeClasses.cardBg} p-4 rounded-lg ${themeClasses.shadow} transition-colors duration-300`}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className={`${themeClasses.text} font-bold`}>Nível</h3>
          <div className={`${themeClasses.buttonSecondary} rounded-full p-3`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <Tooltip id="level-tooltip" />
        </div>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span
                className={`${themeClasses.textSecondary} text-xs font-semibold inline-block`}
              >
                Progresso
              </span>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {userProfile?.level}
            </p>
          </div>
          <div className="mt-4">
            <p className={`${themeClasses.textSecondary} mb-1`}>Progresso</p>
            <div
              className={`w-full ${isDarkTheme ? "bg-gray-700" : "bg-gray-300"} rounded-full h-2 overflow-hidden`}
            >
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              ></div>
            </div>
            <p className={`${themeClasses.textSecondary} text-sm mt-1`}>
              {currentLevelXP}/{xpRequiredForLevel} XP
            </p>
            <p className={`${themeClasses.textSecondary} text-xs mt-1`}>
              Total acumulado: {totalXP} XP
            </p>
          </div>
        </div>
      </div>

      {/* Resources Card */}
      <div
        className={`${themeClasses.cardBg} p-6 rounded-lg ${themeClasses.shadow} transition-colors duration-300 hover:scale-105 transform`}
      >
        <h2
          className={`text-lg font-orbitron mb-3 ${themeClasses.textSecondary}`}
        >
          Recursos
        </h2>
        <div className="flex justify-between items-center">
          <p className={`${themeClasses.text} text-3xl font-bold`}>
            ${(userProfile?.money || 0).toLocaleString("pt-BR")}
          </p>
          <div className={`${themeClasses.buttonSecondary} rounded-full p-3`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <p className={`${themeClasses.textSecondary}`}>
            Ganhos diários:{" "}
            <span className="text-green-500 font-semibold">
              +${(userProfile?.money_daily_gain || 0).toLocaleString("pt-BR")}
            </span>
          </p>
        </div>
      </div>

      {/* Faction Card */}
      <div
        className={`${themeClasses.cardBg} p-6 rounded-lg ${themeClasses.shadow} transition-colors duration-300 hover:scale-105 transform`}
      >
        <h2
          className={`text-lg font-orbitron mb-3 ${themeClasses.textSecondary}`}
        >
          Facção
        </h2>
        <div className="flex justify-between items-center">
          <p
            className={`text-2xl font-bold ${userFaction === "gangsters" ? "text-orange-500" : "text-blue-500"}`}
          >
            {userFaction === "gangsters" ? "GANGSTERS" : "GUARDAS"}
          </p>
          <div
            className={`rounded-full p-3 ${userFaction === "gangsters" ? "bg-orange-100 dark:bg-orange-900" : "bg-blue-100 dark:bg-blue-900"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-6 w-6 ${userFaction === "gangsters" ? "text-orange-500" : "text-blue-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {userFaction === "gangsters" ? (
            <>
              <div className="flex justify-between items-center">
                <span className={`${themeClasses.textSecondary} text-sm`}>
                  Habilidade Especial:
                </span>
                <span className="text-orange-500 font-semibold text-sm">
                  Intimidação
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${themeClasses.textSecondary} text-sm`}>
                  Valor:
                </span>
                <span className="text-orange-500 font-bold">
                  {userProfile?.intimidation?.toFixed(1) || "0.0"}%
                </span>
              </div>
              <p className={`${themeClasses.textSecondary} text-xs`}>
                Reduz a defesa do oponente em combate
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className={`${themeClasses.textSecondary} text-sm`}>
                  Habilidade Especial:
                </span>
                <span className="text-blue-500 font-semibold text-sm">
                  Disciplina
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${themeClasses.textSecondary} text-sm`}>
                  Valor:
                </span>
                <span className="text-blue-500 font-bold">
                  {userProfile?.discipline?.toFixed(1) || "0.0"}%
                </span>
              </div>
              <p className={`${themeClasses.textSecondary} text-xs`}>
                Reduz o dano crítico recebido em combate
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <div
        className={`${themeClasses.cardBg} p-6 rounded-lg ${themeClasses.shadow} transition-colors duration-300 hover:scale-105 transform`}
      >
        <h2
          className={`text-lg font-orbitron mb-3 ${themeClasses.textSecondary}`}
        >
          Estatísticas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className={`${themeClasses.textSecondary} text-sm`}>Vitórias</p>
            <p className="text-xl font-bold text-green-500">
              {userProfile?.victories || 0}
            </p>
          </div>
          <div className="text-center">
            <p className={`${themeClasses.textSecondary} text-sm`}>Derrotas</p>
            <p className="text-xl font-bold text-red-500">
              {userProfile?.defeats || 0}
            </p>
          </div>
          <div className="text-center">
            <p className={`${themeClasses.textSecondary} text-sm`}>Sequência</p>
            <p
              className={`${themeClasses.text} text-xl font-bold text-yellow-500`}
            >
              {userProfile?.winning_streak || 0}
            </p>
          </div>
          <div className="text-center">
            <p className={`${themeClasses.textSecondary} text-sm`}>
              Taxa de Vitória
            </p>
            <p
              className={`${themeClasses.text} text-xl font-bold ${winRate >= 50 ? "text-green-500" : "text-orange-500"}`}
            >
              {winRate}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
