import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '../components/layout';
import { Player, Clan } from '../types/ranking';
import { useRankingCache } from '../hooks/useRankingCache';

// Componente para item do ranking de jogadores
const PlayerRankingItem: React.FC<{ player: Player; gradient: string }> = ({ player, gradient }) => {
  const getCountryFlag = (countryCode?: string) => {
  if (!countryCode) {
    return null; // Sem bandeira quando país não definido
  }
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
};

  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500 text-black'; // Ouro
      case 2:
        return 'bg-gray-300 text-black'; // Prata
      case 3:
        return 'bg-orange-600 text-white'; // Bronze
      default:
        return 'bg-gray-700 text-white';
    }
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg p-4 ${gradient} backdrop-blur-sm border border-white/10`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getPositionColor(player.position ?? 0)}`}>
            {player.position ?? 0}
          </div>

          {getCountryFlag(player.country) && (
            <img 
              src={getCountryFlag(player.country)!} 
              alt={`Bandeira de ${player.country}`} 
              className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
            />
          )}
          <span className="font-medium text-white text-sm min-w-0 flex-1">{player.username}</span>
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <div className="text-sm font-bold text-white whitespace-nowrap">Nv.{player.level}</div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para item do ranking de clãs
const ClanRankingItem: React.FC<{ clan: Clan; gradient: string }> = ({ clan, gradient }) => {
  // Ícone baseado na facção do clã
  const getClanIcon = (faction: string) => {
    return faction === 'gangsters' ? '🔫' : '🛡️';
  };

  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500 text-black'; // Ouro
      case 2:
        return 'bg-gray-300 text-black'; // Prata
      case 3:
        return 'bg-orange-600 text-white'; // Bronze
      default:
        return 'bg-gray-700 text-white';
    }
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg p-4 ${gradient} backdrop-blur-sm border border-white/10`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getPositionColor(clan.position ?? 0)}`}>
            {clan.position ?? 0}
          </div>

          {/* Ícone da facção */}
          <span className="text-sm">{getClanIcon(clan.faction)}</span>

          <span className="font-medium text-white text-sm min-w-0 flex-1">{clan.name}</span>
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <div className="text-sm font-bold text-white whitespace-nowrap">{clan.score?.toLocaleString() || 0}pts</div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para placeholder de posição vazia
const EmptyRankingItem: React.FC<{ position: number; type: 'player' | 'clan' }> = ({ position, type }) => {
  // Função para obter a cor da posição
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/50 text-yellow-200'; // Ouro com opacidade
      case 2:
        return 'bg-gray-300/50 text-gray-200'; // Prata com opacidade
      case 3:
        return 'bg-orange-600/50 text-orange-200'; // Bronze com opacidade
      default:
        return 'bg-gray-700 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 mb-2 opacity-50">
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getPositionColor(position)}`}>
            {position}
          </div>
          <span className="text-sm flex-shrink-0">❓</span>
          <span className="text-gray-500 italic text-sm min-w-0 flex-1">
            {type === 'clan' ? 'Aguardando clã...' : 'Aguardando jogador...'}
          </span>
        </div>
        <div className="text-right flex-shrink-0 ml-1">
          <div className="text-sm font-bold text-gray-600 whitespace-nowrap">---</div>
        </div>
      </div>
    </div>
  );
};

export default function RankingPage() {
  // Usar o hook de cache para gerenciar os rankings (com rankings completos)
  const { data, loading: isLoading, error, lastUpdated: lastUpdate } = useRankingCache(true);
  
  // Extrair dados do cache
  const { gangsters, guardas, clans } = data;

  const rankingConfigs = [
    {
      title: "🔫 TOP 26 GANGSTERS",
      gradient: "from-orange-600 to-red-500",
      borderColor: "border-orange-500/30",
      data: gangsters,
      type: 'player' as const
    },
    {
      title: "🛡️ TOP 26 GUARDAS",
      gradient: "from-blue-600 to-cyan-500",
      borderColor: "border-blue-500/30",
      data: guardas,
      type: 'player' as const
    },
    {
      title: "👥 TOP 26 CLÃS",
      gradient: "from-purple-600 to-pink-500",
      borderColor: "border-purple-500/30",
      data: clans,
      type: 'clan' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo">
      {/* Header */}
      <PageHeader title="Rankings" backTo="/dashboard" backText="Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Título principal */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-orbitron font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            RANKINGS OFICIAIS
          </h1>
          <p className="text-gray-400 text-lg">
            Competição entre os melhores jogadores e clãs do Urban Clash
          </p>
        </motion.div>

        {/* Informação de atualização */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
        >
          <p className="text-gray-300">
            🔄 Atualizado automaticamente a cada 10 minutos
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">
              Última atualização: {lastUpdate.toLocaleString('pt-BR')}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm mt-2">
              ⚠️ {error}
            </p>
          )}
        </motion.div>

        {/* Grid dos rankings */}
        <div className="grid lg:grid-cols-3 gap-8">
          {rankingConfigs.map((config, configIdx) => (
            <motion.div
              key={configIdx}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + configIdx * 0.1, duration: 0.6 }}
              className={`bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border ${config.borderColor} shadow-2xl`}
            >
              {/* Título da seção */}
              <div className="text-center mb-6">
                <h2 className={`text-2xl font-orbitron font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  {config.title}
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r ${config.gradient} mx-auto mt-2 rounded-full"></div>
              </div>
              
              {/* Lista do ranking */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  // Placeholders de carregamento
                  Array.from({ length: 26 }, (_, i) => (
                    <div key={i} className="animate-pulse h-14 bg-gray-700 rounded-lg"></div>
                  ))
                ) : (
                  // Renderizar sempre 26 posições
                  Array.from({ length: 26 }, (_, idx) => {
                    const position = idx + 1;
                    const item = config.data[idx];
                    const gradient = `bg-gradient-to-r ${config.gradient}`;
                    
                    if (item) {
                      // Renderizar item real
                      if (config.type === 'player') {
                        return (
                          <PlayerRankingItem
                            key={item.id || idx}
                            player={{...item as Player, position}}
                            gradient={gradient}
                          />
                        );
                      } else {
                        return (
                          <ClanRankingItem
                            key={item.id || idx}
                            clan={{...item as Clan, position}}
                            gradient={gradient}
                          />
                        );
                      }
                    } else {
                      // Renderizar placeholder para posição vazia
                      return (
                        <EmptyRankingItem
                          key={`empty-${position}`}
                          position={position}
                          type={config.type}
                        />
                      );
                    }
                  })
                )}
              </div>
            </motion.div>
          ))}
        </div>


      </div>
    </div>
  );
}

// Estilos customizados para scrollbar
const styles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}
`;

// Adicionar estilos ao head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}