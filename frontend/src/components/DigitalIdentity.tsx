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
  clan_name?: string;
}

interface DigitalIdentityProps {
  player: PublicPlayer;
  onClose?: () => void;
  isEditing?: boolean;
  editData?: Partial<PublicPlayer>;
  onEditChange?: (data: Partial<PublicPlayer>) => void;
  onToggleEdit?: () => void;
  onSave?: () => void;
  isOwnProfile?: boolean;
}

const getFlagUrl = (code?: string) =>
  code && code !== "null"
    ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
    : null;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderSafeBio = (text?: string) => {
  if (!text) {
    return (
      <span className="italic text-gray-500">
        Este jogador não definiu uma biografia ainda.
      </span>
    );
  }

  const cleanText = escapeHtml(text.substring(0, 100));

  const processed = cleanText
    .replace(/\[b\](.*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\](.*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(
      /\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\](.*?)\[\/color\]/gi,
      '<span style="color: $1">$2</span>',
    );

  return (
    <div
      className="break-words leading-relaxed"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") {
    return "Não informada";
  }

  if (dateStr.length < 10 && !dateStr.includes("T")) {
    return "Data incompleta";
  }

  try {
    const date = dateStr.includes("T")
      ? new Date(dateStr)
      : new Date(`${dateStr}T12:00:00`);

    if (isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR");
  } catch {
    return "Data inválida";
  }
};

const DigitalIdentity = React.memo(
  ({
    player,
    onClose,
    isEditing = false,
    editData,
    onEditChange,
    onToggleEdit,
    onSave,
    isOwnProfile = false,
  }: DigitalIdentityProps) => {
    const factionTheme = useMemo(() => {
      const faction = player?.faction || "gangsters";

      return faction === "gangsters"
        ? {
          primary: "text-orange-500",
          bg: "from-orange-600/40 to-stone-950",
          border: "border-orange-500/30",
          shadow: "shadow-orange-500/10",
          accent: "bg-orange-600",
          glow: "bg-orange-500/20",
        }
        : {
          primary: "text-blue-500",
          bg: "from-blue-600/40 to-stone-950",
          border: "border-blue-500/30",
          shadow: "shadow-blue-500/10",
          accent: "bg-blue-600",
          glow: "bg-blue-500/20",
        };
    }, [player?.faction]);

    const winRate = useMemo(() => {
      const victories = player?.victories || 0;
      const defeats = player?.defeats || 0;
      const total = victories + defeats;
      if (total === 0) return 0;
      return Math.round((victories / total) * 100);
    }, [player?.victories, player?.defeats]);

    const accountDate = useMemo(() => {
      if (!player?.created_at) return "Membro antigo";

      try {
        return new Date(player.created_at).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
      } catch {
        return "Membro antigo";
      }
    }, [player?.created_at]);

    const inputDateValue = useMemo(() => {
      const d = isEditing && editData ? editData.birth_date : player?.birth_date;
      if (!d || d === "null" || d === "undefined") return "";

      if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d;
      }

      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return "";

        const year = date.getUTCFullYear();
        if (year < 1 || year > 9999) return "";

        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        return `${String(year).padStart(4, "0")}-${month}-${day}`;
      } catch {
        return "";
      }
    }, [editData, isEditing, player?.birth_date]);

    const stats = useMemo(
      () => [
        {
          label: "Vitórias",
          value: player?.victories || 0,
          color: "text-green-400",
        },
        {
          label: "Derrotas",
          value: player?.defeats || 0,
          color: "text-red-400",
        },
        {
          label: "Win Rate",
          value: `${winRate}%`,
          color: "text-white",
        },
        {
          label: "Streak",
          value: `x${player?.winning_streak || 0}`,
          color:
            (player?.winning_streak || 0) >= 5
              ? "text-yellow-400"
              : "text-gray-400",
          glow: (player?.winning_streak || 0) >= 5,
        },
      ],
      [player?.victories, player?.defeats, player?.winning_streak, winRate],
    );

    if (!player) return null;

    const safeId = player.id ? player.id.substring(0, 8).toUpperCase() : "00000000";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`relative mx-auto max-h-[90vh] w-full overflow-y-auto rounded-2xl border-2 bg-gradient-to-br p-4 font-exo text-white shadow-2xl sm:p-6 md:max-h-none ${factionTheme.border} ${factionTheme.bg} ${factionTheme.shadow}`}
      >
        <div className="sticky top-0 z-20 mb-4 flex flex-wrap justify-end gap-2 sm:absolute sm:right-4 sm:top-4 sm:mb-0">
          {isOwnProfile && !isEditing && (
            <button
              type="button"
              onClick={onToggleEdit}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold transition-all hover:bg-white/20 sm:px-4 sm:text-xs"
            >
              EDITAR PERFIL
            </button>
          )}

          {isEditing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleEdit}
                className="rounded-full border border-red-500/30 bg-red-900/40 px-3 py-1.5 text-[10px] font-bold transition-all hover:bg-red-900/60 sm:px-4 sm:text-xs"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={onSave}
                className={`rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold transition-all hover:brightness-110 sm:px-4 sm:text-xs ${factionTheme.accent}`}
              >
                SALVAR
              </button>
            </div>
          )}

          {onClose && !isEditing && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black/20 p-1 text-white/50 transition-colors hover:text-white sm:bg-transparent"
              aria-label="Fechar perfil"
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-6 pt-2 text-white sm:gap-8 sm:pt-0 md:flex-row md:items-start">
          <div className="group relative shrink-0">
            <div
              className={`absolute -inset-1 rounded-full blur-lg transition-all group-hover:blur-xl ${factionTheme.glow}`}
            />
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white/10 bg-black/40 sm:h-32 sm:w-32 md:h-40 md:w-40">
              {isEditing ? (
                <div className="relative h-full w-full">
                  <img
                    src={editData?.avatar_url || player.avatar_url || ""}
                    alt=""
                    className="h-full w-full object-cover opacity-50"
                  />
                  <div className="group/avatar absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-2 backdrop-blur-[2px]">
                    <div className="pointer-events-none absolute top-[30%] text-center text-[6px] font-bold uppercase tracking-widest text-blue-300 opacity-0 transition-all duration-300 group-hover/avatar:opacity-100 sm:text-[7px]">
                      Ex.: imgur.com/123456789.jpeg
                    </div>

                    <div className="flex w-full translate-y-1 items-center gap-1">
                      <input
                        type="text"
                        maxLength={100}
                        value={editData?.avatar_url || ""}
                        onChange={(e) =>
                          onEditChange?.({
                            ...editData,
                            avatar_url: e.target.value,
                          })
                        }
                        className="flex-1 rounded border border-white/30 bg-black/80 px-1.5 py-0.5 text-center text-[7px] text-white placeholder-white/30 focus:border-white/60 focus:outline-none sm:text-[9px]"
                        placeholder="URL Avatar..."
                      />
                      {editData?.avatar_url && (
                        <button
                          type="button"
                          onClick={() =>
                            onEditChange?.({ ...editData, avatar_url: "" })
                          }
                          className="px-0.5 text-[8px] font-bold text-red-500 hover:text-red-400 sm:text-[10px]"
                          title="Limpar foto"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-[6px] font-bold uppercase text-white/50 sm:text-[7px]">
                        {editData?.avatar_url?.length || 0}/100
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-white/30">
                        .jpeg .png
                      </span>
                    </div>
                  </div>
                </div>
              ) : player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={player.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/20 sm:text-4xl">
                  {(player.username || "U")[0].toUpperCase()}
                </div>
              )}
            </div>

            <div
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white/20 px-2 py-1 text-[10px] font-bold shadow-lg sm:px-3 sm:text-xs ${factionTheme.accent}`}
            >
              NÍVEL {player.level || 1}
            </div>
          </div>

          <div className="w-full min-w-0 flex-grow space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:justify-start">
                <h1 className="max-w-full truncate font-orbitron text-2xl font-extrabold tracking-wider sm:text-3xl md:text-4xl">
                  {player.display_name || player.username || "Soldado Urbano"}
                </h1>

                {player.country &&
                  player.country !== "null" &&
                  getFlagUrl(player.country) && (
                    <img
                      src={getFlagUrl(player.country)!}
                      alt={player.country}
                      className="h-4 rounded-sm shadow-sm sm:h-5 md:h-6"
                    />
                  )}
              </div>

              <p
                className={`mt-1 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs ${factionTheme.primary}`}
              >
                {player.clan_name || "Sem Divisão"}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/30 p-4 text-sm text-gray-200 backdrop-blur-sm">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    maxLength={100}
                    value={editData?.bio || ""}
                    onChange={(e) =>
                      onEditChange?.({ ...editData, bio: e.target.value })
                    }
                    className="h-20 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2 text-sm focus:border-white/30 focus:outline-none"
                    placeholder="Conte sua história... (Suporta BBCode [b], [i], [color])"
                  />
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500">
                    <span>BBCode habilitado</span>
                    <span>{editData?.bio?.length || 0}/100</span>
                  </div>
                </div>
              ) : (
                renderSafeBio(player.bio)
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[8px] font-bold uppercase tracking-widest text-gray-500 sm:gap-x-6 sm:text-[10px] md:justify-start">
              <span className="flex items-center gap-1">
                NA REDE DESDE: <span className="text-gray-300">{accountDate}</span>
              </span>

              <span className="flex items-center gap-1">
                NASCIMENTO:
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={inputDateValue}
                      onChange={(e) =>
                        onEditChange?.({
                          ...editData,
                          birth_date: e.target.value,
                        })
                      }
                      className="rounded border border-white/10 bg-black/40 px-1 text-[8px] text-gray-300 focus:border-white/30 focus:outline-none sm:text-[10px]"
                    />
                    {inputDateValue && (
                      <button
                        type="button"
                        onClick={() =>
                          onEditChange?.({ ...editData, birth_date: "" })
                        }
                        className="text-[8px] font-bold uppercase tracking-tighter text-red-500 hover:text-red-400"
                      >
                        [ Limpar ]
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-300">
                    {formatDate(player.birth_date)}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-lg border bg-black/20 p-2 text-center transition-transform hover:-translate-y-1 hover:bg-black/40 sm:rounded-xl sm:p-3 ${factionTheme.border}`}
            >
              {stat.glow && (
                <div className="absolute inset-0 animate-pulse bg-yellow-400/5" />
              )}
              <p className="mb-1 text-[8px] font-bold uppercase tracking-tighter text-gray-500 sm:text-[10px]">
                {stat.label}
              </p>
              <p
                className={`font-orbitron text-sm font-bold sm:text-lg md:text-xl ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[9px] text-gray-600">
          <span>ID #{safeId}</span>
          <span>
            VERIFICAÇÃO DE IDENTIDADE • {(player.username || "USUARIO").toUpperCase()}
          </span>
        </div>
      </motion.div>
    );
  },
);

DigitalIdentity.displayName = "DigitalIdentity";

export default DigitalIdentity;