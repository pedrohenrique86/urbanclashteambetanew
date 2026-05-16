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
  Lock as LockIcon,
  Globe
} from "lucide-react";

import { Avatar } from "../components/ui/Avatar";
import { getFactionColor } from "../utils/faction";

type Player = {
  id?: string;
  user_id?: string;
  username: string;
  display_name?: string;
  faction?: string; // SÊNIOR: Adicionado para coloração
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
  const [activeTab, setActiveTab] = useState<"terminal" | "battalion">("terminal");

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
        accent: "text-blue-500",
        border: "border-blue-500/20",
        bg: "bg-blue-500/5",
        gradient: "from-blue-600/20 to-zinc-950",
        glow: "shadow-[0_0_30px_rgba(59,130,246,0.1)]",
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

      {/* SUPER CONTÊINER TERMINAL UNIFICADO */}
      <div className={`relative max-w-7xl w-full mx-auto flex flex-col rounded-[2rem] border-2 ${theme.border} bg-black/60 backdrop-blur-2xl overflow-hidden shadow-2xl ${theme.glow} transition-all duration-700`}>
        
        {/* Fundo Neon Dinâmico */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-[0.10] pointer-events-none`} />

        {/* 1. HEADER INTEGRADO & CONTÍNUO */}
        <div className={`relative z-10 px-5 py-4 border-b border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-black/60 border ${theme.border} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                 <ThemeIcon className={`w-6 h-6 ${theme.accent} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
              </div>
              <div className="flex flex-col min-w-0">
                 <div className="flex items-center gap-2 mb-0.5">
                    <Activity className={`w-2.5 h-2.5 ${theme.accent} animate-pulse`} />
                    <span className="text-[8px] font-black font-orbitron text-zinc-400 tracking-[0.2em] uppercase">{theme.label}</span>
                 </div>
                 <h1 className="text-xl md:text-2xl font-black font-orbitron text-white leading-tight tracking-tighter uppercase italic break-words drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                    {clan?.name}
                 </h1>
                 <p className="text-zinc-500 text-[9px] mt-0.5 max-w-md line-clamp-1">
                    {clan?.description || "Protocolo de descrição não preenchido."}
                 </p>
              </div>
           </div>

           <div className={`flex items-center gap-4 bg-[#0a0a0a] border ${theme.border} px-4 py-2 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]`}>
              <div className="flex flex-col items-center">
                 <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">STRENGTH</span>
                 <span className={`text-base font-black font-orbitron text-white leading-none ${theme.glow}`}>{clan?.score || 0}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col items-center">
                 <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">VAULT</span>
                 <span className="text-base font-black font-orbitron text-green-400 leading-none drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">${(clan?.vault || 0).toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* 2. MOBILE TABS SWITCHER */}
        <div className="flex md:hidden border-b border-white/10 bg-black/40 p-1">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
              activeTab === "terminal"
                ? `bg-white/10 ${theme.accent} shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]`
                : "text-zinc-500"
            }`}
          >
            <Zap size={14} />
            <span className="text-[10px] font-black font-orbitron tracking-widest uppercase">TERMINAL</span>
          </button>
          <button
            onClick={() => setActiveTab("battalion")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
              activeTab === "battalion"
                ? `bg-white/10 ${theme.accent} shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]`
                : "text-zinc-500"
            }`}
          >
            <Users size={14} />
            <span className="text-[10px] font-black font-orbitron tracking-widest uppercase">BATTALION</span>
          </button>
        </div>

        {/* 3. BODY COM DISPOSIÇÃO EMBUTIDA (Borders Divisoras Internas) */}
        <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full min-h-[500px]">
           
           {/* Lado Esquerdo: Chat ocupa a maioria em telas grandes */}
           <div className={`flex-1 flex lg:min-h-[550px] border-b lg:border-b-0 lg:border-r border-white/5 bg-transparent ${activeTab === 'terminal' ? 'flex' : 'hidden md:flex'}`}>
              {/* Passando uma nova altura h-full para alinhar */}
              <ClanChat members={clan?.members} />
           </div>

           {/* Lado Direito: Dossiê e Painel de Controle */}
           <div className={`w-full lg:w-[320px] xl:w-[380px] flex flex-col bg-zinc-950/40 relative ${activeTab === 'battalion' ? 'flex' : 'hidden md:flex'}`}>
              
              {/* Título Lista */}
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/40">
                 <div className="flex items-center gap-2">
                    <Users className={`w-3.5 h-3.5 ${theme.accent}`} />
                    <span className="text-[9px] font-black font-orbitron text-white tracking-widest uppercase opacity-90 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">SQUAD_LINK</span>
                 </div>
                 <span className="text-[9px] font-orbitron font-black text-zinc-400 bg-black/50 border border-white/10 px-2 py-0.5 rounded">
                    {clan?.member_count} / {clan?.max_members || 40}
                 </span>
              </div>

              {/* Box Rolar Lista */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 lg:max-h-[400px]">
                 {clan?.members?.map((member, index) => (
                    <motion.div
                      key={member.id || member.user_id || index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(173, 24, 24, 0.03)" }}
                      className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-white/10 transition-colors cursor-pointer group"
                      onClick={() => openUserPanel(member.user_id || member.id || "")}
                    >
                       <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <div className={`w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:border-${theme.accent.split('-')[1]}-500/50 transition-colors`}>
                             {member.avatar_url ? (
                               <img src={member.avatar_url} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500" alt="" />
                             ) : (
                               <Users className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                             )}
                          </div>
                          {member.country && (
                            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-2.5 rounded-[1px] shadow-[0_0_5px_rgba(0,0,0,0.8)] overflow-hidden border border-black z-10">
                               <img src={getCountryFlag(member.country)!} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                          {/* Accent Glow on Hover */}
                          <div className={`absolute inset-0 rounded-lg ${theme.bg} opacity-0 group-hover:opacity-100 blur-md -z-10 transition-opacity`} />
                       </div>

                       <div className="flex items-center justify-between flex-grow min-w-0">
                          <span className={`text-xs font-black font-orbitron ${getFactionColor(member.faction)} uppercase truncate pr-2 transition-all`}>
                             {member.username}
                          </span>
                          <div className={`px-2 py-1 rounded-lg bg-black/80 border ${theme.border.replace('/20', '/40')} flex items-center gap-1.5 group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                             <span className={`text-[12px] font-black ${theme.accent} uppercase tracking-tighter opacity-60`}>NVL</span>
                             <span className={`text-sm font-black font-orbitron text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`}>
                                {member.level || 1}
                             </span>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 
                 {(!clan?.members || clan.members.length === 0) && (
                    <div className="p-4 text-center text-xs text-zinc-500 font-medium">Nenhum membro listado.</div>
                 )}
              </div>

              {/* Comandos / Operações no rodapé fixo do painel */}
              <div className="p-4 border-t border-white/5 bg-black/80 flex flex-col gap-3 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl" />
                 
                 <div className="flex items-center gap-2 mb-1">
                    <LockIcon className="w-3 h-3 text-red-500/80" />
                    <span className="text-[8px] font-black font-orbitron text-zinc-500 tracking-widest uppercase">ADMINISTRAÇÃO_PERMITIDA</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 relative z-10">
                    <button 
                      onClick={() => setConfirmLeave(true)}
                      className="flex items-center justify-center p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 hover:bg-red-500/10 transition-all group"
                    >
                       <LogOut className="w-3.5 h-3.5 text-red-500 mb-0 lg:mb-1 mr-1.5 lg:mr-0 group-hover:-translate-y-0.5 transition-transform" />
                       <span className="text-[8px] font-black font-orbitron text-red-400 tracking-widest uppercase text-center leading-none">SAIR<span className="hidden lg:inline">_DA DIVISÃO</span></span>
                    </button>
                    
                    <button 
                      className="flex items-center justify-center p-2.5 rounded-xl bg-zinc-900/50 border border-white/5 hover:bg-white/5 transition-all opacity-50 cursor-not-allowed group"
                    >
                       <Target className="w-3.5 h-3.5 text-zinc-500 mb-0 lg:mb-1 mr-1.5 lg:mr-0 grayscale" />
                       <span className="text-[8px] font-black font-orbitron text-zinc-500 tracking-widest uppercase text-center leading-none">RECRUTAR</span>
                    </button>
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
                  VOCÊ ESTÁ PRESTES A ENCERRAR SUA CONEXÃO COM A DIVISÃO <span className="text-white italic">&quot;{clan?.name}&quot;</span>. ESTA AÇÃO É IRREVERSÍVEL.
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