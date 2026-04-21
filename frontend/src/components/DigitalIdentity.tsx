import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Skull, 
  X,
  Edit3,
  Check,
  Zap,
  Globe,
  Trophy,
  History,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Frown,
  Activity,
  User,
  Hash,
  Star,
  TrendingUp,
  Award
} from "lucide-react";

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
  isCompact?: boolean;
}

const getFlagUrl = (code?: string) =>
  code && code !== "null"
    ? `https://flagcdn.com/w80/${code.toLowerCase()}.png`
    : null;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderSafeBio = (text?: string) => {
  if (!text) return <span className="italic text-zinc-600 text-[11px]">Nenhum registro biográfico.</span>;
  const cleanText = escapeHtml(text.substring(0, 100));
  const processed = cleanText
    .replace(/\[b\](.*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\](.*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\](.*?)\[\/color\]/gi, '<span style="color: $1">$2</span>');

  return <div className="break-words text-zinc-400 text-xs leading-snug" dangerouslySetInnerHTML={{ __html: processed }} />;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return "DESCONHECIDA";
  try {
    const rawDate = dateStr.split('T')[0];
    const [year, month, day] = rawDate.split('-').map(Number);
    if (!year || !month || !day) return "INVALIDADA";
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return "INVÁLIDA"; }
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
    isCompact = false,
  }: DigitalIdentityProps) => {
    const [isExpanded, setIsExpanded] = useState(!isCompact);
    const [localDate, setLocalDate] = useState("");

    // Sincroniza valor inicial quando entra no modo edição
    React.useEffect(() => {
       if (isEditing && editData?.birth_date) {
          const raw = editData.birth_date.split('T')[0];
          const [y, m, d] = raw.split("-");
          if (y && m && d) setLocalDate(`${d}${m}${y}`);
       } else if (!isEditing) {
          setLocalDate("");
       }
    }, [isEditing, editData?.birth_date]);
    
    const factionTheme = useMemo(() => {
      const factionString = (player?.faction || "gangsters").toLowerCase();
      const isGangster = factionString.includes("gangster") || factionString.includes("renegado");
      return isGangster
        ? { primary: "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]", border: "border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.1)]", bg: "bg-orange-500/10", accent: "from-orange-500 to-red-900", button: "bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.5)]", icon: Skull, label: "RENEGADO", boxGlow: "shadow-[0_0_30px_rgba(249,115,22,0.15)]", borderIcon: "border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.2)]" }
        : { primary: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]", border: "border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.1)]", bg: "bg-cyan-500/10", accent: "from-cyan-400 to-blue-900", button: "bg-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]", icon: Shield, label: "GUARDIÃO", boxGlow: "shadow-[0_0_30px_rgba(34,211,238,0.15)]", borderIcon: "border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]" };
    }, [player?.faction]);

    const winRate = useMemo(() => {
      const total = (player.victories || 0) + (player.defeats || 0);
      return total === 0 ? 0 : Math.round(((player.victories || 0) / total) * 100);
    }, [player.victories, player.defeats]);

    if (!player) return null;
    const safeId = player.id ? player.id.substring(0, 8).toUpperCase() : "00";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={`w-[95vw] ${isCompact ? 'max-w-md' : 'max-w-4xl'} mx-auto overflow-hidden rounded-[2rem] border-2 ${factionTheme.border} bg-[#0a0a0a] ${factionTheme.boxGlow} relative selection:bg-zinc-800 before:absolute before:inset-0 before:bg-gradient-to-br ${factionTheme.accent} before:opacity-[0.08] before:pointer-events-none transition-all duration-500`}
      >
        {/* Balloon Point (Tail) */}
        {isCompact && (
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0a0a] border-r-2 border-b-2 ${factionTheme.border} rotate-45 z-[-1]`} />
        )}
        <div className="p-5 sm:p-8">
           {/* Compact Header for external links */}
           <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-lg ${factionTheme.bg} flex items-center justify-center border ${factionTheme.borderIcon || factionTheme.border}`}>
                    <Fingerprint className={`w-4 h-4 ${factionTheme.primary}`} />
                 </div>
                 <span className="text-[10px] font-black font-orbitron text-zinc-400 uppercase tracking-widest drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]">D.IDENTITY</span>
              </div>
              <div className="flex items-center gap-3">
                 {isOwnProfile && <button onClick={onToggleEdit} className={`p-1 px-2 text-[10px] font-bold ${isEditing ? 'text-red-400' : 'text-zinc-500'} hover:text-white transition-colors uppercase tracking-widest`}>{isEditing ? "CANCELAR" : "EDITAR"}</button>}
                 {onClose && <button onClick={onClose} className="p-1 text-zinc-500 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>}
              </div>
           </div>

           {/* Layout Grid: Changes behavior based on mode */}
           <div className={`grid grid-cols-1 ${isCompact && !isExpanded ? '' : (isCompact ? 'grid-cols-1' : 'lg:grid-cols-12')} gap-6`}>
              
              {/* Left/Main Column - Always Visible */}
              <div className={!isCompact ? "lg:col-span-5 flex flex-col items-center lg:items-start" : "flex items-center gap-6"}>
                 <div className="relative flex-shrink-0 group">
                    <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-2 ${factionTheme.border} bg-zinc-900 overflow-hidden ${factionTheme.boxGlow} transition-transform group-hover:scale-[1.02]`}>
                       {isEditing ? (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-2 z-10 backdrop-blur-sm">
                             <input 
                               type="text" value={editData?.avatar_url || ""} onChange={(e) => onEditChange?.({...editData, avatar_url: e.target.value})}
                               className="w-full bg-black text-[8px] text-white border border-white/10 rounded px-1 focus:outline-none" placeholder="PHOTO_URL"
                             />
                          </div>
                       ) : null}
                       {player.avatar_url ? (
                          <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-10"><factionTheme.icon className="w-10 h-10 text-white" /></div>
                       )}
                    </div>
                    {!isCompact && <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-lg ${factionTheme.button} border border-white/10 shadow-lg text-[10px] font-black font-orbitron text-white italic`}>LVL {player.level}</div>}
                 </div>

                 <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl sm:text-2xl font-black font-orbitron text-white uppercase italic tracking-tighter break-words leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{player.display_name || player.username}</h2>
                       {player.country && <img src={getFlagUrl(player.country)!} className="w-5 h-auto rounded-sm opacity-80 drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]" alt="" />}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] font-black font-orbitron tracking-widest uppercase ${player.clan_name ? factionTheme.primary : "text-yellow-400"}`}>{player.clan_name || "SOLO"}</span>
                       {isCompact && <div className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[8px] font-black text-zinc-400">NVL {player.level}</div>}
                    </div>
                 </div>
              </div>

              {/* Right/Stats Column - High Density */}
              <div className={!isCompact ? "lg:col-span-7 flex flex-col gap-4" : "mt-2"}>
                 <div className="grid grid-cols-4 gap-2">
                    <StatBox label="SCORE" value={player.victories} icon={Trophy} color="text-green-500" />
                    <StatBox label="LOSSES" value={player.defeats} icon={Frown} color="text-red-500" />
                    <StatBox label="W_RATE" value={`${winRate}%`} icon={Target} color={factionTheme.primary} />
                    <StatBox label="STREAK" value={`x${player.winning_streak}`} icon={Zap} color={player.winning_streak >= 5 ? "text-yellow-400" : "text-zinc-500"} pulse={player.winning_streak >= 5} />
                 </div>
              </div>
           </div>

           {/* Expandable Section */}
           <AnimatePresence>
              {isExpanded && (
                 <motion.div 
                    initial={isCompact ? { height: 0, opacity: 0 } : false} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                 >
                    <div className={`grid grid-cols-1 ${!isCompact ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6 mt-6 pt-6 border-t border-white/5`}>
                       {/* Bio Box */}
                       <div className="space-y-3">
                          <div className="flex items-center gap-2 opacity-40"><Activity className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">MEMORIA_BIOMETRICA</span></div>
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 min-h-[80px]">
                             {isEditing ? (
                                <div className="flex flex-col h-full justify-between">
                                   <div className="relative">
                                     <textarea value={editData?.bio || ""} onChange={(e) => onEditChange?.({...editData, bio: e.target.value})} className="w-full h-20 bg-transparent text-sm text-white focus:outline-none resize-none" maxLength={100} />
                                     <div className="absolute bottom-0 right-0 text-[10px] font-mono text-zinc-600 select-none">
                                        {(editData?.bio || "").length}/100
                                     </div>
                                   </div>
                                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
                                      <Zap className="w-3 h-3" /> BB CODE SUPORTADO:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-zinc-300"><span className="text-zinc-500">[b]</span>NEGRITO<span className="text-zinc-500">[/b]</span></span>
                                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-zinc-300"><span className="text-zinc-500">[i]</span>ITÁLICO<span className="text-zinc-500">[/i]</span></span>
                                      <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-zinc-300"><span className="text-zinc-500">[color=#HEX]</span>COR<span className="text-zinc-500">[/color]</span></span>
                                    </div>
                                  </div>
                                </div>
                             ) : renderSafeBio(player.bio)}
                          </div>
                       </div>
                       
                       {/* Additional Metadata */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-2 opacity-40"><Target className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">METADADOS_SISTEMA</span></div>
                          <div className="grid grid-cols-2 gap-4">
                             <DataPoint label="SINC_REDE" value={player.created_at ? new Date(player.created_at).toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}) : 'N/A'} icon={History} />
                             <DataPoint 
                                label="MATRIZ_NASC" 
                                value={isEditing ? (
                                    <input 
                                       type="text" 
                                       placeholder="DD/MM/AAAA"
                                       maxLength={10}
                                       value={(() => {
                                          const d = localDate;
                                          let m = "";
                                          if (d.length > 0) {
                                             m = d.substring(0, 2);
                                             if (d.length > 2) m += "/" + d.substring(2, 4);
                                             if (d.length > 4) m += "/" + d.substring(4, 8);
                                          }
                                          return m;
                                       })()}
                                       onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, "").substring(0, 8);
                                          setLocalDate(val);
                                          
                                          if (val.length === 8) {
                                             const dd = val.substring(0, 2);
                                             const mm = val.substring(2, 4);
                                             const yyyy = val.substring(4, 8);
                                             
                                             const dayNum = parseInt(dd);
                                             const monthNum = parseInt(mm);
                                             const yearNum = parseInt(yyyy);
                                             
                                             if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900) {
                                                onEditChange?.({...editData, birth_date: `${yyyy}-${mm}-${dd}`});
                                             }
                                          } else if (val.length === 0) {
                                             onEditChange?.({...editData, birth_date: ""});
                                          }
                                       }}
                                       className="bg-black text-[10px] w-24 border-none focus:outline-none text-zinc-400 placeholder:opacity-30" 
                                    />
                                ) : formatDate(player.birth_date)} 
                                icon={Calendar} 
                             />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                             <span className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">IDENT_ID</span>
                             <span className="text-[10px] font-mono text-zinc-400">#{safeId}</span>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>

           {/* Control: MOSTRAR MAIS / MOSTRAR MENOS */}
           {isCompact && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-[8px] font-black font-orbitron text-zinc-500 hover:text-white transition-all uppercase tracking-[0.4em] border-t border-white/5"
              >
                 {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                 {isExpanded ? "RECOLHER" : "MOSTRAR MAIS"}
              </button>
           )}

           {isEditing && (
              <button onClick={onSave} className={`w-full mt-6 py-4 rounded-2xl ${factionTheme.button} text-white text-[10px] font-black font-orbitron tracking-[0.4em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all`}>
                 CONSOLIDAR_ALTERAÇÕES
              </button>
           )}
        </div>
      </motion.div>
    );
  },
);

const StatBox = ({ label, value, icon: Icon, color, pulse }: any) => (
  <div className={`p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center hover:bg-white/[0.05] transition-all group ${pulse ? 'shadow-[0_0_15px_rgba(250,204,21,0.15)] border-yellow-500/30' : 'hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] border-transparent'}`}>
     <Icon className={`w-3.5 h-3.5 ${color} mb-1.5 drop-shadow-[0_0_5px_currentColor] ${pulse ? 'animate-pulse' : ''}`} />
     <span className="text-sm font-black font-orbitron text-white leading-none group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all">{value}</span>
     <span className="text-[6px] font-black text-zinc-500 uppercase tracking-widest mt-1">{label}</span>
  </div>
);

const DataPoint = ({ label, value, icon: Icon }: any) => (
   <div className="flex flex-col gap-1.5 group">
      <span className="text-[7px] font-black text-zinc-500 uppercase transition-colors group-hover:text-zinc-400">{label}</span>
      <div className="flex items-center gap-2 text-zinc-300">
         <Icon className="w-3 h-3 opacity-30 drop-shadow-[0_0_3px_currentColor] transition-all group-hover:opacity-80" />
         <span className="text-xs font-medium truncate transition-colors group-hover:text-white drop-shadow-sm">{value}</span>
      </div>
   </div>
);

DigitalIdentity.displayName = "DigitalIdentity";
export default DigitalIdentity;