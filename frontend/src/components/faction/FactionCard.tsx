import { motion } from "framer-motion";

interface FactionCardProps {
  faction: "gangsters" | "guardas";
  selectedFaction: "gangsters" | "guardas" | null;
  onSelect: (faction: "gangsters" | "guardas") => void;
}

export default function FactionCard({
  faction,
  selectedFaction,
  onSelect,
}: FactionCardProps) {
  const isSelected = selectedFaction === faction;

  const config = {
    gangsters: {
      title: "GANGSTERS",
      color: "orange",
      description:
        "Domine as ruas com estratégia e força. Os Gangsters controlam o submundo.",
      strength: "Intimidação e controle territorial",
      weakness: "Vulnerabilidade à lei e ordem",
      powerLabel: "Poder",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      ),
    },
    guardas: {
      title: "GUARDAS",
      color: "blue",
      description:
        "Mantenha a ordem e proteja a cidade. Os Guardas defendem a lei e combatem o crime.",
      strength: "Autoridade e disciplina",
      weakness: "Limitados por regras e burocracia",
      powerLabel: "Proteção",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      ),
    },
  };

  const factionConfig = config[faction];
  const colorClasses = {
    orange: {
      ring: "ring-orange-500",
      shadow: "shadow-orange-500/50",
      hoverShadow: "hover:shadow-orange-500/30",
      gradient: "from-orange-800/90",
      title: "text-orange-400",
      iconBg: "bg-orange-700",
      iconText: "text-orange-300",
      strengthBg: "bg-orange-900/50",
      strengthText: "text-orange-300",
      powerBar: "bg-orange-400",
      powerText: "text-orange-300",
      selectedBg: "bg-orange-500",
    },
    blue: {
      ring: "ring-blue-500",
      shadow: "shadow-blue-500/50",
      hoverShadow: "hover:shadow-blue-500/30",
      gradient: "from-blue-800/90",
      title: "text-blue-400",
      iconBg: "bg-blue-700",
      iconText: "text-blue-300",
      strengthBg: "bg-blue-900/50",
      strengthText: "text-blue-300",
      powerBar: "bg-blue-400",
      powerText: "text-blue-300",
      selectedBg: "bg-blue-500",
    },
  };

  const colors = colorClasses[factionConfig.color as keyof typeof colorClasses];

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(faction)}
      className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 transform ${
        isSelected
          ? `ring-4 ${colors.ring} ring-opacity-80 shadow-lg ${colors.shadow}`
          : `hover:shadow-lg ${colors.hoverShadow}`
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} to-black z-0`}
      ></div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2
            className={`text-xl sm:text-2xl md:text-3xl font-orbitron ${colors.title}`}
          >
            {factionConfig.title}
          </h2>
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full ${colors.iconBg} flex items-center justify-center`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${colors.iconText}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {factionConfig.icon}
            </svg>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-gray-300 text-lg">{factionConfig.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`${colors.strengthBg} p-3 rounded-lg`}>
              <div className={`font-bold ${colors.strengthText} mb-1`}>
                FORÇA
              </div>
              <div className="text-gray-300">{factionConfig.strength}</div>
            </div>
            <div className={`${colors.strengthBg} p-3 rounded-lg`}>
              <div className={`font-bold ${colors.strengthText} mb-1`}>
                FRAQUEZA
              </div>
              <div className="text-gray-300">{factionConfig.weakness}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-8 h-1 rounded ${
                  i <= 4 ? colors.powerBar : "bg-gray-600"
                }`}
              ></div>
            ))}
            <span className={`ml-2 ${colors.powerText} text-sm`}>
              {factionConfig.powerLabel}
            </span>
          </div>

          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`${colors.selectedBg} text-white text-sm font-bold py-1 px-3 rounded-full`}
            >
              SELECIONADO
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
