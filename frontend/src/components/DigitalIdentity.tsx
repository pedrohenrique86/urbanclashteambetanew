import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface PublicPlayer {
  id: string;
  username: string;
  display_name?: string;
  country?: string;
  avatar_url?: string;
  bio?: string;
  level: number;
  faction: "gangsters" | "guardas";
  victories: number;
  defeats: number;
  winning_streak: number;
  created_at?: string;
  birth_date?: string;
}

interface DigitalIdentityProps {
  player: PublicPlayer;
  onClose?: () => void;
}

/**
 * DigitalIdentity - Um componente de perfil público com estética AAA.
 * Focado em impacto visual, performance e semântica de jogo.
 */
export default function DigitalIdentity({ player, onClose }: DigitalIdentityProps) {
  // Coores baseadas na facção
  const factionTheme = useMemo(() => {
    return player.faction === "gangsters"
      ? {
          primary: "text-orange-500",
          bg: "from-orange-600/20 to-stone-900",
          border: "border-orange-500/30",
          shadow: "shadow-orange-500/10",
          accent: "bg-orange-600",
          glow: "bg-orange-500/20",
        }
      : {
          primary: "text-blue-500",
          bg: "from-blue-600/20 to-stone-900",
          border: "border-blue-500/30",
          shadow: "shadow-blue-500/10",
          accent: "bg-blue-600",
          glow: "bg-blue-500/20",
        };
  }, [player.faction]);

  // Função para obter a bandeira (reutilizada)
  const getFlagUrl = (code?: string) => 
    code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : null;

  // Motor de renderização BBCode simples e seguro
  const renderBio = (text?: string) => {
    if (!text) return <span className="text-gray-500 italic">Este jogador não definiu uma biografia ainda.</span>;
    
    // Limita a 100 caracteres antes de renderizar
    const cleanText = text.substring(0, 100);
    
    // Regex para BBCode básico
    // [b] -> strong, [i] -> em, [color=hex] -> span style
    let processed = cleanText
      .replace(/\[b\](.*?)\[\/b\]/gi, "<strong>$1</strong>")
      .replace(/\[i\](.*?)\[\/i\]/gi, "<em>$1</em>")
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color: $1">$2</span>');

    return <div className="break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  const winRate = useMemo(() => {
    const total = player.victories + player.defeats;
    if (total === 0) return 0;
    return Math.round((player.victories / total) * 100);
  }, [player.victories, player.defeats]);

  const accountDate = player.created_at 
    ? new Date(player.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "Membro antigo";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border-2 ${factionTheme.border} bg-gradient-to-br ${factionTheme.bg} p-6 shadow-2xl ${factionTheme.shadow} text-white font-exo`}
    >
      {/* Botão Curtir/Fechar se disponível */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Lado Esquerdo: Avatar e Nível */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-full ${factionTheme.glow} blur-lg group-hover:blur-xl transition-all`}></div>
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 overflow-hidden bg-black/40">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/20">
                {player.username[0].toUpperCase()}
              </div>
            )}
          </div>
          {/* Badge de Nível */}
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${factionTheme.accent} px-3 py-1 rounded-full text-xs font-bold border-2 border-white/20 shadow-lg`}>
            NÍVEL {player.level}
          </div>
        </div>

        {/* Lado Direito: Identidade */}
        <div className="flex-grow text-center md:text-left space-y-4">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl md:text-4xl font-orbitron font-extrabold tracking-wider truncate max-w-[250px]">
                {player.display_name || player.username}
              </h1>
              {getFlagUrl(player.country) && (
                <img src={getFlagUrl(player.country)!} alt={player.country} className="h-6 rounded-sm shadow-sm" />
              )}
            </div>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${factionTheme.primary}`}>
              {player.faction === "gangsters" ? "Alta Periculosidade" : "Ordem e Progresso"}
            </p>
          </div>

          {/* Bio Renderizada */}
          <div className="bg-black/30 backdrop-blur-sm border border-white/5 rounded-xl p-4 text-sm text-gray-200">
            {renderBio(player.bio)}
          </div>

          {/* Datas */}
          <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
            <span className="flex items-center gap-1">
               NA REDE DESDE: <span className="text-gray-300">{accountDate}</span>
            </span>
            {player.birth_date && (
               <span className="flex items-center gap-1">
                NASCIMENTO: <span className="text-gray-300">{new Date(player.birth_date).toLocaleDateString()}</span>
               </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Estatísticas AAA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {[
          { label: "Vitórias", value: player.victories, color: "text-green-400" },
          { label: "Derrotas", value: player.defeats, color: "text-red-400" },
          { label: "Win Rate", value: `${winRate}%`, color: "text-white" },
          { 
            label: "Streak", 
            value: `x${player.winning_streak}`, 
            color: player.winning_streak >= 5 ? "text-yellow-400" : "text-gray-400",
            glow: player.winning_streak >= 5 
          },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={`relative overflow-hidden bg-black/20 border ${factionTheme.border} rounded-xl p-3 text-center transition-transform hover:-translate-y-1 hover:bg-black/40`}
          >
            {stat.glow && <div className="absolute inset-0 bg-yellow-400/5 animate-pulse"></div>}
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter mb-1">{stat.label}</p>
            <p className={`text-xl font-orbitron font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rodapé Decorativo */}
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] text-gray-600 font-mono">
        <span>ID #{player.id.substring(0, 8).toUpperCase()}</span>
        <span className="animate-pulse">SISTEMA ATRAVÉS DO REDIS • CLOUDLINK SECURE</span>
      </div>
    </motion.div>
  );
}
