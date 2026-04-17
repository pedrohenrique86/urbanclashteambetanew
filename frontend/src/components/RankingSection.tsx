import React, { useState } from "react";
import { motion } from "framer-motion";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";
import PlayerRankingItem from "./PlayerRankingItem";
import ClanRankingItem from "./ClanRankingItem";
import RankingUpdateNotification from "./RankingUpdateNotification";
import {
  getPositionDisplay,
  getPositionSizeClass,
  getPositionTextColor,
} from "../utils/rankingUtils";

export default function RankingSection() {
  // Funções type guard para verificar tipos
  const isPlayer = (item: any): item is Player => {
    return (
      item &&
      typeof item.username === "string" &&
      typeof item.level === "number"
    );
  };

  const isClan = (item: any): item is Clan => {
    return (
      item && typeof item.name === "string" && typeof item.score === "number"
    );
  };

  // Usar o hook de cache para gerenciar os rankings (SSOT)
  const { data, loading, error, lastUpdated } = useRankingCache();
  const [showNotification, setShowNotification] = useState(false);

  // Extrair dados do cache
  const { gangsters, guardas, clans } = data;

  // Mostrar notificação quando os dados forem atualizados
  React.useEffect(() => {
    if (lastUpdated) {
      setShowNotification(true);

      // Esconder a notificação após 5 segundos
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  // Configurações para os diferentes tipos de ranking
  const gangsterConfig = {
    title: "TOP 5 RENEGADOS",
    gradient: "from-orange-600 to-orange-500",
    bgColor: "bg-orange-600/20",
    borderColor: "border-orange-500/30",
    delay: 0.3,
    data: (gangsters || []).slice(0, 5),
    type: "gangsters" as const,
  };

  const guardConfig = {
    title: "TOP 5 GUARDIÕES",
    gradient: "from-blue-600 to-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    delay: 0.4,
    data: (guardas || []).slice(0, 5),
    type: "guardas" as const,
  };

  // Definição específica para o tipo Clan para evitar problemas de tipagem
  const clanConfig = {
    title: "TOP 5 DIVISÕES",
    gradient: "from-purple-600 to-purple-500",
    bgColor: "bg-purple-600/20",
    borderColor: "border-purple-500/30",
    delay: 0.5,
    data: (clans || []).slice(0, 5),
    type: "clans" as const,
  };

  const rankingConfigs = [gangsterConfig, guardConfig, clanConfig];

  return (
    <motion.section
      id="rankings"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="py-20 px-4 bg-gradient-to-b from-gray-800 to-gray-900 relative"
    >
      {/* Notificação de atualização */}
      {showNotification && lastUpdated && (
        <RankingUpdateNotification lastUpdated={lastUpdated} />
      )}

      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-orbitron text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
        >
          RANKINGS
        </motion.h2>

        {/* Informação sobre atualização */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center text-gray-400 mb-16"
        >
          Atualizado a cada 10 minutos • Última atualização:{" "}
          {lastUpdated
            ? (() => {
                const roundedDate = new Date(lastUpdated);
                roundedDate.setMinutes(
                  Math.floor(lastUpdated.getMinutes() / 10) * 10,
                  0,
                  0,
                  0,
                );
                return roundedDate.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              })()
            : "Carregando..."}
        </motion.p>

        <div className="grid md:grid-cols-3 gap-8">
          {rankingConfigs.map((config, configIdx) => (
            <motion.div
              key={configIdx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: config.delay, duration: 0.6 }}
              viewport={{ once: true }}
              className={`bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border ${config.borderColor} shadow-2xl`}
            >
              <h3
                className={`text-2xl font-orbitron text-center mb-8 bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
              >
                {config.title}
              </h3>

              <div className="space-y-3">
                {loading ? (
                  // Placeholders de carregamento aprimorados
                  Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`loading-${configIdx}-${index}`}
                      className="bg-gray-700/50 animate-pulse h-[60px] rounded-lg"
                    />
                  ))
                ) : error ? (
                  // Mensagem de erro aprimorada
                  <div className="text-center text-red-400/80 py-8">
                    <p className="font-semibold mb-2">Erro ao carregar</p>
                    <p className="text-sm text-gray-400/70">
                      Tentando reconectar...
                    </p>
                  </div>
                ) : (
                  // Lógica de renderização final e unificada
                  Array.from({ length: 5 }).map((_, index) => {
                    const item = config.data[index];

                    // Renderiza o item real se ele existir
                    if (item) {
                      return (
                        <div key={item.id} className="h-[62px]">
                          {isPlayer(item) ? (
                            <PlayerRankingItem
                              player={item}
                              bgColor={config.bgColor}
                            />
                          ) : isClan(item) ? (
                            <ClanRankingItem
                              clan={item}
                              bgColor={config.bgColor}
                            />
                          ) : null}
                        </div>
                      );
                    }

                    // Renderiza o placeholder com o fundo sólido
                    const position = index + 1;
                    const displayType =
                      config.type === "clans" ? "clan" : "player";

                    return (
                      <div
                        key={`placeholder-${configIdx}-${index}`}
                        className={`${config.bgColor} p-2 sm:p-3 rounded-lg h-[62px] flex items-center opacity-60`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 w-full">
                          {/* Posição */}
                          <span
                            className={`${getPositionSizeClass(
                              position,
                            )} font-bold min-w-[24px] sm:min-w-[30px] text-center flex-shrink-0 ${getPositionTextColor(
                              position,
                              config.type,
                            )}`}
                          >
                            {getPositionDisplay(position, displayType)}
                          </span>

                          {/* Espaço para Bandeira/Escudo */}
                          <div className="w-5 h-4 flex-shrink-0"></div>

                          {/* Nome */}
                          <span className="text-gray-400 font-medium flex-grow min-w-0 text-sm sm:text-base truncate">
                            - - -
                          </span>

                          {/* Nível/Pontos */}
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={`text-sm font-bold text-gray-500`}>
                              ---
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
