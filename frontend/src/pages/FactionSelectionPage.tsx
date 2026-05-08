import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import {
  BackgroundEffects,
  FactionHeader,
  FactionCard,
} from "../components/faction";

export default function FactionSelectionPage() {
  const [selectedFaction, setSelectedFaction] = useState<
    "gangsters" | "guardas" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const { user } = useAuth();

  const { userProfile: profile, loading: profileLoading } = useUserProfile();
  const { refreshProfile, processProfileData, setUserProfile } = useUserProfileContext();
  const [coords, setCoords] = useState({ x: 34.92, y: -12.04 });
  const [sync, setSync] = useState(0.02);

  // Live Tactical Data Fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords(prev => ({
        x: Number((prev.x + (Math.random() * 0.04 - 0.02)).toFixed(2)),
        y: Number((prev.y + (Math.random() * 0.04 - 0.02)).toFixed(2))
      }));
      setSync(Number((0.02 + (Math.random() * 0.01)).toFixed(3)));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFactionSelect = async () => {
    if (profileLoading) {
      setError("Aguarde a verificação do seu perfil antes de continuar.");
      return;
    }

    if (!selectedFaction) {
      setError("Por favor, selecione uma facção.");
      return;
    }

    showLoading("Confirmando sua facção...");
    setError(null);

    // Delay cinemático para aumentar a tensão da escolha
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      let newProfileData = null;

      // Só cria/atualiza se ainda não tem facção
      if (!profile?.faction) {
        try {
          const res = await api.post("/users/profile", {
            faction: selectedFaction,
            username: user.user_metadata?.username || user.email?.split("@")[0] || "Recruta",
          });
          newProfileData = res.data;
        } catch (creationError: any) {
          const isDuplicateProfile = creationError.response?.status === 409;
          if (isDuplicateProfile) {
            // Perfil já existe — só atualiza a facção
            const putRes = await api.put(`/users/${user.id}/profile`, { faction: selectedFaction });
            newProfileData = putRes.data.profile;
          } else {
            throw creationError;
          }
        }
      }

      // 1. Atualiza o estado global IMEDIATAMENTE com os dados retornados pela API.
      // Isso evita qualquer "race condition" com o refreshProfile / fetch deduplication.
      if (newProfileData) {
        const processed = processProfileData(newProfileData, user);
        setUserProfile(processed);
      } else {
        // Fallback apenas por segurança
        await refreshProfile();
      }

      hideLoading();
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("❌ Erro:", error);
      setError(error.message || "Erro ao processar escolha.");
      hideLoading();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 md:p-12 relative bg-black select-none custom-scrollbar">
      {/* 1. Cinematic Background Layers */}
      <div className="fixed inset-0 z-0">
        <BackgroundEffects selectedFaction={selectedFaction} />
      </div>

      {/* 2. Main Selection Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key="selection-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-7xl flex flex-col items-center -mt-6 pb-6"
        >
          {/* Header Section */}
          <FactionHeader />

          {/* Faction Grid - Tightened for better proximity */}
          <div className="relative w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 mb-16 items-stretch justify-center max-w-5xl">
            
            {/* Center Decorative Status Indicator - Scaled Down */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 z-20">
               <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
               <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <motion.div 
                    animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                  />
                  <span className="text-[7px] font-black font-orbitron tracking-[0.2em] text-zinc-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    RECRUIT: <span className="text-emerald-400">ACTIVE</span>
                  </span>
               </div>
               <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            </div>

            {/* Faction Cards */}
            <div className="flex justify-center items-start h-full">
              <FactionCard
                faction="gangsters"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
                onConfirm={handleFactionSelect}
              />
            </div>

            <div className="flex justify-center items-start h-full">
              <FactionCard
                faction="guardas"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
                onConfirm={handleFactionSelect}
              />
            </div>
          </div>

          {/* Messaging Area */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-red-500 font-orbitron text-[9px] uppercase tracking-[0.4em] text-center mb-12 border border-red-500/30 bg-red-500/5 py-4 px-10 rounded-sm backdrop-blur-md"
              >
                [ ERR_LOG_0X44: {error} ]
              </motion.div>
            )}
          </AnimatePresence>

          {/* NEW: Tactical System Footer (Creative AAA Addition) */}
          <div className="w-full mt-10 relative">
             <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-6 group">
                {/* Glossy Reflection Animation */}
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-12 pointer-events-none"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center px-2 md:px-4 relative z-10">
                   {/* 1. Live System Log (Marquee Effect) */}
                   <div className="flex items-center gap-4 border-l border-white/10 pl-4 min-w-0">
                      <span className="text-[8px] font-black font-orbitron text-orange-500 tracking-widest shrink-0 drop-shadow-md">SYSTEM_LOG:</span>
                      <div className="overflow-hidden flex-1 relative h-4 flex items-center">
                         <div className="flex gap-12 animate-marquee-slow whitespace-nowrap absolute left-0">
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[OK] INTERFACE_NEURAL_STABLE</span>
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[OK] SECTOR_4_ENCRYPTED</span>
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[OK] ACCESS_GRANTED_LEVEL_1</span>
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[WARN] DISPUTE_IN_PROGRESS_S7</span>
                            {/* Duplicate for infinite loop feel */}
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[OK] INTERFACE_NEURAL_STABLE</span>
                            <span className="text-[9px] text-zinc-300 font-mono tracking-tighter uppercase drop-shadow-sm">[OK] SECTOR_4_ENCRYPTED</span>
                         </div>
                      </div>
                   </div>

                   {/* 2. Central Faction Balance Indicator (Visual Flair) */}
                   <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1">
                         {[...Array(12)].map((_, i) => (
                           <motion.div 
                             key={i}
                             animate={{ opacity: [0.2, 0.6, 0.2] }}
                             transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                             className={`w-1 h-3 ${i < 6 ? 'bg-orange-500/60' : 'bg-blue-500/60'}`} 
                           />
                         ))}
                      </div>
                      <span className="text-[7px] text-zinc-400 font-black tracking-[0.4em] uppercase drop-shadow-sm">Global_Influence_Scale</span>
                   </div>

                   {/* 3. Tactical Data Blocks */}
                   <div className="flex items-center justify-end gap-8">
                      <div className="flex flex-col items-end">
                         <span className="text-[7px] text-orange-500/70 font-black uppercase tracking-widest">NET_COORD</span>
                         <span className="text-[10px] text-zinc-100 font-mono tracking-widest drop-shadow-md">
                           {coords.x.toFixed(2)} / {coords.y.toFixed(2)}
                         </span>
                      </div>
                      <div className="flex flex-col items-end border-r border-white/10 pr-8">
                         <span className="text-[7px] text-blue-500/70 font-black uppercase tracking-widest">SYNC_DELAY</span>
                         <span className="text-[10px] text-emerald-400 font-mono tracking-widest drop-shadow-md">{sync}ms</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>



  );
}