import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useHUD } from "../contexts/HUDContext";
import { apiClient } from "../lib/supabaseClient";
import { ClanChat } from "../components/clan/ClanChat";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";
import { 
  Users, 
  Shield, 
  Target, 
  Wallet, 
  LogOut, 
  ChevronRight, 
  Skull,
  Activity,
  Zap,
  Lock,
  Globe
} from "lucide-react";

type Player = {
  id?: string;
  user_id?: string;
  username: string;
  display_name?: string;
  level?: number;
  role?: string;
  country?: string;
  avatar_url?: string;
};

type ClanData = {
  id: string;
  name: string;
  description?: string;
  faction?: "gangsters" | "guardas";
  member_count?: number;
  max_members?: number;
  available_slots?: number;
  score?: number;
  vault?: number;
  members?: Player[];
};

export default function ClanPage() {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useUserProfileContext();
  const { openUserPanel } = useHUD();

  const [clan, setClan] = useState<ClanData | null>(null);
  const [clanLoading, setClanLoading] = useState<boolean>(true);
  const [clanError, setClanError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [confirmLeave, setConfirmLeave] = useState<boolean>(false);

  const theme = useMemo(() => {
    const rawF = clan?.faction || (userProfile?.faction as any)?.name || userProfile?.faction;
    const f = FACTION_ALIAS_MAP_FRONTEND[String(rawF).toLowerCase().trim()] || "gangsters";

    return f === "gangsters"
      ? {
        accent: "text-orange-500",
        border: "border-orange-500/20",
        bg: "bg-orange-500/5",
        gradient: "from-orange-600/20 to-zinc-950",
        glow: "shadow-[0_0_30px_rgba(249,115,22,0.1)]",
        icon: Skull,
        label: "REDE_RENEGADA_ATIVA"
      }
      : {
        accent: "text-cyan-400",
        border: "border-cyan-500/20",
        bg: "bg-cyan-500/5",
        gradient: "from-cyan-600/20 to-zinc-950",
        glow: "shadow-[0_0_30px_rgba(34,211,238,0.1)]",
        icon: Shield,
        label: "CENTRO_DE_OPERACOES_ESTATAIS"
      };
  }, [clan?.faction, userProfile?.faction]);

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  useEffect(() => {
    if (userProfile?.clan_id) {
      fetchClan(userProfile.clan_id);
    } else if (userProfile) {
      navigate("/qg", { replace: true });
    }
  }, [userProfile, navigate]);

  const fetchClan = async (clanId: string) => {
    try {
      setClanLoading(true);
      setClanError(null);
      const data = await apiClient.getClan(clanId);
      const rawClan = data?.clan || data || {};
      const rawMembers = data?.members || rawClan?.members || [];

      let normalized: ClanData = {
        id: rawClan?.id || clanId,
        name: rawClan?.name || "Divisão",
        description: rawClan?.description || "",
        faction: rawClan?.faction,
        member_count: Array.isArray(rawMembers) ? rawMembers.length : (rawClan?.member_count ?? 0),
        max_members: rawClan?.max_members ?? rawClan?.capacity ?? 40,
        available_slots: rawClan?.available_slots,
        score: rawClan?.score ?? rawClan?.strength ?? 0,
        vault: rawClan?.vault ?? rawClan?.cofre ?? 0,
        members: Array.isArray(rawMembers) ? rawMembers : [],
      };

      if ((!normalized.members || normalized.members.length === 0) && normalized.id) {
        try {
          const m = await apiClient.getClanMembers(String(normalized.id));
          const membersList = m?.members || m || [];
          normalized = {
            ...normalized,
            members: Array.isArray(membersList) ? membersList : [],
            member_count: Array.isArray(membersList) ? membersList.length : normalized.member_count,
          };
        } catch (error) {
          console.warn("Falha ao carregar membros:", error);
        }
      }
      setClan(normalized);
    } catch (e) {
      setClanError("Erro crítico na conexão com a divisão.");
    } finally {
      setClanLoading(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!clan?.id || !userProfile) return;
    try {
      setLeaving(true);
      await apiClient.leaveClan(clan.id);
      setUserProfile((prev) => (prev ? { ...prev, clan_id: undefined } : null));
      navigate("/qg");
    } catch (e) {
      setClanError("Protocolo de saída falhou.");
    } finally {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  if (clanLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
        <Zap className="w-12 h-12 text-zinc-800 animate-bounce mb-4" />
        <span className="text-[10px] font-black font-orbitron text-zinc-600 tracking-[0.4em] uppercase">SINCRONIZANDO_REDE_BATTALION</span>
      </div>
    );
  }

  const ThemeIcon = theme.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-screen flex flex-col pt-1 pb-24 px-4 sm:px-6 lg:px-8 space-y-4 overflow-x-hidden"
    >
      {/* Cinematic Glitch/Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-40 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Header Section - Cinematic Hero */}
      <div className={`relative rounded-2xl overflow-hidden border ${theme.border} bg-zinc-950/80 backdrop-blur-md ${theme.glow}`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-40`} />
        
        <div className="relative px-5 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-black/60 border ${theme.border} flex items-center justify-center flex-shrink-0`}>
                 <ThemeIcon className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.accent} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
              </div>
              <div className="flex flex-col min-w-0">
                 <div className="flex items-center gap-2 mb-0.5">
                    <Activity className={`w-2.5 h-2.5 ${theme.accent} animate-pulse`} />
                    <span className="text-[8px] font-black font-orbitron text-zinc-500 tracking-[0.2em] uppercase">{theme.label}</span>
                 </div>
                 <h1 className="text-2xl sm:text-3xl font-black font-orbitron text-white leading-none tracking-tighter uppercase italic truncate">
                    {clan?.name}
                 </h1>
                 <p className="text-zinc-500 text-[10px] mt-1 max-w-md leading-tight font-medium line-clamp-1">
                    {clan?.description || "Protocolo de descrição não preenchido."}
                 </p>
              </div>
           </div>

           {/* Quick Stats HUD - More Compact */}
           <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
              <div className="flex flex-col items-center">
                 <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">STRENGTH</span>
                 <span className="text-base sm:text-lg font-black font-orbitron text-white leading-none">{clan?.score || 0}</span>
              </div>
              <div className="w-px h-6 bg-white/5" />
              <div className="flex flex-col items-center">
                 <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">VAULT</span>
                 <span className="text-base sm:text-lg font-black font-orbitron text-green-500 leading-none">${(clan?.vault || 0).toLocaleString()}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Main Grid Layout - Bento Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Elite Chat Portal (7/12) */}
        <div className="lg:col-span-7 flex flex-col h-[500px] sm:h-[650px]">
           <ClanChat members={clan?.members} />
        </div>

        {/* Right Column: Member Dossier & Operations (5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
           
           {/* Member Dossier Card */}
           <div className={`flex flex-col flex-grow bg-black/80 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl`}>
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Users className={`w-4 h-4 ${theme.accent}`} />
                    <span className="text-xs font-black font-orbitron text-white tracking-widest uppercase">DOSSIÊ_DE_MEMBROS</span>
                 </div>
                 <span className="text-[10px] font-orbitron font-bold text-zinc-500">
                    {clan?.member_count} / {clan?.max_members || 40}
                 </span>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar p-1 space-y-1">
                 {clan?.members?.map((member, index) => (
                    <motion.div
                      key={member.id || member.user_id || index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.03)" }}
                      className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-white/5 group cursor-pointer"
                      onClick={() => openUserPanel(member.user_id || member.id || "")}
                    >
                       <div className="relative flex-shrink-0">
                          <div className={`w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden`}>
                             {member.avatar_url ? (
                               <img src={member.avatar_url} className="w-full h-full object-cover" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center opacity-20">
                                  <Users className="w-4 h-4 text-zinc-500" />
                               </div>
                             )}
                          </div>
                          {member.country && (
                            <div className="absolute -bottom-1 -left-1 w-4 h-3 rounded shadow-sm overflow-hidden border border-black/50">
                               <img src={getCountryFlag(member.country)!} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                       </div>

                       <div className="flex items-center justify-between flex-grow min-w-0">
                          <span className="text-xs font-black font-orbitron text-white uppercase truncate pr-2">
                             {member.username}
                          </span>
                          <div className={`px-2 py-0.5 rounded bg-zinc-900 border border-white/5 flex items-center gap-1`}>
                             <span className="text-[7px] font-black text-zinc-500 uppercase">NVL</span>
                             <span className={`text-[10px] font-black font-orbitron ${theme.accent}`}>{member.level || 1}</span>
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>

           {/* Operations Management Card */}
           <div className="bg-black/80 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                 <Zap className="w-4 h-4 text-yellow-500" />
                 <span className="text-xs font-black font-orbitron text-white tracking-widest uppercase">PROTOCOLO_DE_DIVISÃO</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setConfirmLeave(true)}
                   className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-950/20 border border-red-500/10 hover:bg-red-950/40 transition-all group"
                 >
                    <LogOut className="w-5 h-5 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black font-orbitron text-red-400 tracking-widest uppercase text-center leading-none">ABANDONAR_DIVISÃO</span>
                 </button>
                 
                 <button 
                   className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/60 transition-all group opacity-50 cursor-not-allowed"
                 >
                    <Lock className="w-5 h-5 text-zinc-600 mb-2" />
                    <span className="text-[9px] font-black font-orbitron text-zinc-500 tracking-widest uppercase text-center leading-none">RECRUTAR_AGORA</span>
                 </button>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-4">
                 <div className="flex items-center gap-2 grayscale opacity-40">
                    <span className="text-[7px] font-black text-white uppercase tracking-[0.2em]">VERSION_6.0.4_BETA</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Confirmation Modal - Tactical Protocol */}
      <AnimatePresence>
        {confirmLeave && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmLeave(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-red-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.2)] text-center overflow-hidden"
            >
               {/* Red Glow Light Impact */}
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />
               
               <div className="inline-flex p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
                  <LogOut className="w-8 h-8 text-red-500 animate-pulse" />
               </div>
               
               <h3 className="font-orbitron font-black text-xl text-white uppercase tracking-tight mb-2">ABORTAR OPERAÇÃO?</h3>
               <p className="text-zinc-500 text-xs font-medium leading-relaxed mb-8 uppercase tracking-widest">
                  VOCÊ ESTÁ PRESTES A ENCERRAR SUA CONEXÃO COM A DIVISÃO <span className="text-white italic">"{clan?.name}"</span>. ESTA AÇÃO É IRREVERSÍVEL.
               </p>

               <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleLeaveClan}
                    disabled={leaving}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black font-orbitron text-[10px] tracking-[0.3em] uppercase rounded-xl transition-all shadow-lg shadow-red-900/20"
                  >
                    {leaving ? "PROCESSANDO..." : "CONFIRMAR_SAÍDA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black font-orbitron text-[10px] tracking-[0.3em] uppercase rounded-xl transition-all"
                  >
                    ABORTAR_CANCELAMENTO
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}