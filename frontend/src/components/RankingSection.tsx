import React, { useState } from "react";
import { motion } from "framer-motion";
import { Player, Clan } from "../types/ranking";
import { useRankingCache } from "../hooks/useRankingCache";
import PlayerRankingItem from "./PlayerRankingItem";
import ClanRankingItem from "./ClanRankingItem";
import RankingUpdateNotification from "./RankingUpdateNotification";

export default function RankingSection() {
  // Usar o hook de cache para gerenciar os rankings (limitado a 5 para home page)
  const { data, loading, error, lastUpdated } = useRankingCache(true);
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
    title: "🔫 TOP GANGSTERS",
    gradient: "from-orange-600 to-orange-500",
    borderColor: "border-orange-500/30",
    delay: 0.3,
    data: (gangsters || []).slice(0, 5),
    renderItem: (item: Player, index: number) => (
      <PlayerRankingItem
        key={`gangster-${index}`}
        player={item}
        gradient="from-orange-600 to-orange-500"
      />
    ),
  };

  const guardConfig = {
    title: "🛡️ TOP GUARDAS",
    gradient: "from-blue-600 to-blue-400",
    borderColor: "border-blue-500/30",
    delay: 0.4,
    data: (guardas || []).slice(0, 5),
    renderItem: (item: Player, index: number) => (
      <PlayerRankingItem
        key={`guarda-${index}`}
        player={item}
        gradient="from-blue-600 to-blue-400"
      />
    ),
  };

  // Definição específica para o tipo Clan para evitar problemas de tipagem
  const clanConfig = {
    title: "👥 TOP CLÃS",
    gradient: "from-purple-600 to-purple-500",
    borderColor: "border-purple-500/30",
    delay: 0.5,
    data: (clans || []).slice(0, 5),
    // Especificando o tipo correto para o item
    renderItem: (item: Clan, index: number) => (
      <ClanRankingItem
        key={`clan-${index}`}
        clan={item}
        gradient="from-purple-600 to-purple-500"
      />
    ),
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

              <div className="space-y-4">
                {loading ? (
                  // Mostrar placeholders durante o carregamento
                  Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`loading-${configIdx}-${index}`}
                      className="bg-gray-700 animate-pulse h-14 rounded-lg"
                    />
                  ))
                ) : error ? (
                  // Mostrar mensagem de erro
                  <div className="text-center text-red-400 py-8">
                    <p className="mb-4">{error}</p>
                    <p className="text-sm text-gray-400">
                      Os dados serão atualizados automaticamente
                    </p>
                  </div>
                ) : config.data.length > 0 ? (
                  // Mostrar os dados do ranking
                  // Usar uma abordagem tipada para cada configuração específica
                  config === gangsterConfig ? (
                    gangsterConfig.data.map((item, index) =>
                      gangsterConfig.renderItem(item, index),
                    )
                  ) : config === guardConfig ? (
                    guardConfig.data.map((item, index) =>
                      guardConfig.renderItem(item, index),
                    )
                  ) : (
                    clanConfig.data.map((item, index) =>
                      clanConfig.renderItem(item, index),
                    )
                  )
                ) : (
                  // Mostrar mensagem quando não houver dados
                  <div className="text-center text-gray-400 py-4">
                    {config === clanConfig
                      ? "Nenhum clã encontrado"
                      : "Nenhum jogador encontrado nesta facção"}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}