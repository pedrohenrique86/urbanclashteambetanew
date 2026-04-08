// Define a cor do texto da posição, sem fundo
export const getPositionTextColor = (
  position?: number,
  faction?: "gangsters" | "guardas" | "clans",
) => {
  if (!position) return "text-gray-400";
  switch (position) {
    case 1:
      return "text-yellow-400"; // Ouro
    case 2:
      return "text-gray-300"; // Prata
    case 3:
      return "text-orange-400"; // Bronze
    default:
      if (faction === "guardas") return "text-blue-400";
      if (faction === "gangsters") return "text-orange-500";
      if (faction === "clans") return "text-purple-400";
      return "text-gray-400";
  }
};

// Define o tamanho da fonte com base na posição
export const getPositionSizeClass = (position?: number) => {
  if (!position || position <= 3) {
    return "text-lg sm:text-xl"; // Tamanho maior para Top 3
  }
  return "text-sm sm:text-base"; // Tamanho padrão para 4+
};

// Exibe troféu/medalha para o Top 3, ou o número para as demais posições
export const getPositionDisplay = (
  position?: number,
  type: "player" | "clan" = "player",
) => {
  if (!position) return "—";
  switch (position) {
    case 1:
      return "🏆";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return type === "player" ? `${position}º` : String(position);
  }
};