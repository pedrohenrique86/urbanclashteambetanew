import React from "react";
import {
  getCriticalChanceExplanation,
  getCriticalDamageExplanation,
} from "../../utils/combat";

interface UserProfile {
  username?: string;
  level?: number;
  energy?: number;
  current_xp?: number;
  action_points?: number;
  attack?: number;
  defense?: number;
  focus?: number;
  money?: number;
  faction?: string;
}

interface UserInfoCardProps {
  userProfile: UserProfile;
  combatStats: {
    criticalChance: number;
    criticalDamage: number;
    effectiveDefense: number;
    effectiveDamageReduction: number;
  };
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
  compact?: boolean;
}

import { Avatar } from "../ui/Avatar";

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  userProfile,
  combatStats,
  themeClasses,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="user-info-compact">
        {/* Nome do usuário acima da tabela */}
        <div className="text-center mb-2">
          <p className={`${themeClasses.text} text-sm font-medium`}>
            {userProfile?.username || "Usuário"}
          </p>
        </div>
        {/* Grade compacta de stats 2x5 com bordas */}
        <div
          className={`grid grid-cols-2 gap-1 text-xs border ${themeClasses.border} rounded p-1`}
        >
          {/* Linha 1 */}
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-r ${themeClasses.border}`}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>Nível</div>
            <div className="font-bold text-green-400">{userProfile?.level}</div>
          </div>
          <div className="bg-gray-800/20 rounded p-1 text-center">
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Energia
            </div>
            <div className="font-bold text-orange-400">
              {userProfile?.energy}
            </div>
          </div>

          {/* Linha 2 */}
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-r border-t ${themeClasses.border}`}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>XP</div>
            <div className="font-bold text-purple-400">
              {userProfile?.current_xp}
            </div>
          </div>
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-t ${themeClasses.border}`}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Pontos de Ação
            </div>
            <div className="font-bold text-green-400">
              {userProfile?.action_points?.toLocaleString("pt-BR")}
            </div>
          </div>

          {/* Linha 3 */}
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-r border-t ${themeClasses.border} cursor-help hover:bg-gray-700/30 transition-colors`}
            title={userProfile?.attack?.toFixed(2)}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Ataque
            </div>
            <div className="font-bold text-red-400">{userProfile?.attack}</div>
          </div>
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-t ${themeClasses.border} cursor-help hover:bg-gray-700/30 transition-colors`}
            title={userProfile?.defense?.toFixed(2)}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Defesa
            </div>
            <div className="font-bold text-blue-400">
              {userProfile?.defense}
            </div>
          </div>

          {/* Linha 4 */}
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-r border-t ${themeClasses.border} cursor-help hover:bg-gray-700/30 transition-colors`}
            title={userProfile?.focus?.toFixed(2)}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>Foco</div>
            <div className="font-bold text-purple-400">
              {userProfile?.focus}
            </div>
          </div>
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-t ${themeClasses.border}`}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Dinheiro
            </div>
            <div className="font-bold text-yellow-400">
              ${(userProfile?.money || 0).toLocaleString("pt-BR")}
            </div>
          </div>

          {/* Linha 5 */}
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-r border-t ${themeClasses.border} cursor-help`}
            title={getCriticalChanceExplanation()}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Chance Crítico
            </div>
            <div className="font-bold text-pink-400">
              {combatStats.criticalChance.toFixed(0)}%
            </div>
          </div>
          <div
            className={`bg-gray-800/20 rounded p-1 text-center border-t ${themeClasses.border} cursor-help`}
            title={getCriticalDamageExplanation(userProfile?.faction || "")}
          >
            <div className={`${themeClasses.textSecondary} text-xs`}>
              Dano Crítico
            </div>
            <div className="font-bold text-pink-400">
              {combatStats.criticalDamage.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-info mt-4 px-4">
      <div className="flex flex-col items-center mb-4">
        <Avatar 
          src={(userProfile as any)?.avatar_url} 
          className="w-20 h-20 mb-2"
        />
        <h2 className={`text-xl font-bold ${themeClasses.text}`}>
          {userProfile?.username || "Usuário"}
        </h2>
        <div className="flex items-center mt-1">
          <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full mr-1">
            Nível {userProfile?.level}
          </span>
          <span className={`${themeClasses.textSecondary} text-xs`}>
            {userProfile?.current_xp} XP
          </span>
        </div>
      </div>

      {/* Grade de stats expandida */}
      <div className="stats-grid grid grid-cols-2 gap-3">
        {/* Linha 1 */}
        <div className="stat-item bg-gray-800/50 rounded-lg p-3 text-center">
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Nível
          </div>
          <div className="font-bold text-green-400 text-lg">
            {userProfile?.level}
          </div>
        </div>

        <div className="stat-item bg-gray-800/50 rounded-lg p-3 text-center">
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Energia
          </div>
          <div className="font-bold text-orange-400 text-lg">
            {userProfile?.energy}
          </div>
        </div>

        {/* Linha 2 */}
        <div className="stat-item bg-gray-800/50 rounded-lg p-3 text-center">
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>XP</div>
          <div className="font-bold text-purple-400 text-lg">
            {userProfile?.current_xp}
          </div>
        </div>

        <div className="stat-item bg-gray-800/50 rounded-lg p-3 text-center">
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Pontos de Ação
          </div>
          <div className="font-bold text-green-400 text-lg">
            {userProfile?.action_points?.toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Linha 3 */}
        <div 
          className="stat-item bg-gray-800/50 rounded-lg p-3 text-center cursor-help hover:bg-gray-700/30 transition-colors"
          title={userProfile?.attack?.toFixed(2)}
        >
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Ataque
          </div>
          <div className="font-bold text-red-400 text-lg">
            {userProfile?.attack}
          </div>
        </div>

        <div 
          className="stat-item bg-gray-800/50 rounded-lg p-3 text-center cursor-help hover:bg-gray-700/30 transition-colors"
          title={userProfile?.defense?.toFixed(2)}
        >
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Defesa
          </div>
          <div className="font-bold text-blue-400 text-lg">
            {userProfile?.defense}
          </div>
        </div>

        {/* Linha 4 */}
        <div 
          className="stat-item bg-gray-800/50 rounded-lg p-3 text-center cursor-help hover:bg-gray-700/30 transition-colors"
          title={userProfile?.focus?.toFixed(2)}
        >
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Foco
          </div>
          <div className="font-bold text-purple-400 text-lg">
            {userProfile?.focus}
          </div>
        </div>

        <div className="stat-item bg-gray-800/50 rounded-lg p-3 text-center">
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Dinheiro
          </div>
          <div className="font-bold text-yellow-400 text-lg">
            ${(userProfile?.money || 0).toLocaleString("pt-BR")}
          </div>
        </div>

        {/* Linha 5 */}
        <div
          className="stat-item bg-gray-800/50 rounded-lg p-3 text-center cursor-help hover:bg-gray-700/50 transition-colors"
          title={getCriticalChanceExplanation()}
        >
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Chance Crítica
          </div>
          <div className="font-bold text-pink-400 text-lg">
            {combatStats.criticalChance.toFixed(0)}%
          </div>
        </div>

        <div
          className="stat-item bg-gray-800/50 rounded-lg p-3 text-center cursor-help hover:bg-gray-700/50 transition-colors"
          title={getCriticalDamageExplanation(userProfile?.faction || "")}
        >
          <div className={`${themeClasses.textSecondary} text-xs mb-1`}>
            Dano Crítico
          </div>
          <div className="font-bold text-pink-400 text-lg">
            {combatStats.criticalDamage.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;
