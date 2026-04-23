import React, { useState } from "react";
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden custom-scrollbar bg-black/60 backdrop-blur-[2px]">
      {/* 1. Cinematic Background Layers */}
      <BackgroundEffects selectedFaction={selectedFaction} />

      {/* 2. Top Navigation Bar (Decorative AAA) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600/50 via-white/20 to-blue-600/50 z-50 opacity-50" />
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-12 opacity-30 pointer-events-none">
        <span className="text-[8px] font-black font-orbitron tracking-[0.5em] text-white">SYSTEM_BOOT: OK</span>
        <span className="text-[8px] font-black font-orbitron tracking-[0.5em] text-white">RECRUIT_SYNC: READY</span>
      </div>

      {/* 3. Main Selection Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key="selection-container"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-6xl mt-10"
        >
          {/* Header Section */}
          <FactionHeader />

          {/* Faction Grid - Cinematic Vertical Divider in-between */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-24 mb-16 px-4">
            
            {/* Center Decorative Divider (Holographic effect) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 overflow-hidden">
               <div className="w-full h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
               <motion.div 
                 animate={{ y: ["-100%", "100%"] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                 className="w-full h-20 bg-gradient-to-b from-transparent via-white to-transparent opacity-30"
               />
            </div>

            {/* Faction Cards - (Props not modified as per instructions) */}
            <div className="relative group">
              <FactionCard
                faction="gangsters"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
                onConfirm={handleFactionSelect}
              />
            </div>

            <div className="relative group">
              <FactionCard
                faction="guardas"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
                onConfirm={handleFactionSelect}
              />
            </div>
          </div>

          {/* Bottom Information (Tactical Footer) */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 font-mono text-[10px] uppercase tracking-widest text-center mb-8 border border-red-500/20 bg-red-500/5 py-2 px-4 rounded"
            >
              [ ALERTA_ERRO: {error} ]
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="block text-[7px] text-zinc-500 font-black">ENCRYPT_KEY</span>
                <span className="block text-[9px] text-zinc-400 font-mono">X92-ALFA-BETA</span>
              </div>
              <div className="w-2 h-2 rounded-full border border-white/20 flex items-center justify-center">
                 <div className="w-0.5 h-0.5 bg-white rounded-full" />
              </div>
              <div className="text-left">
                <span className="block text-[7px] text-zinc-500 font-black">ACCESS_LEVEL</span>
                <span className="block text-[9px] text-zinc-400 font-mono">LEVEL_01_INITIAL</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Decorative Corner Accents (AAA Touch) */}
      <div className="fixed top-4 left-4 w-12 h-12 border-t border-l border-white/5 pointer-events-none" />
      <div className="fixed top-4 right-4 w-12 h-12 border-t border-r border-white/5 pointer-events-none" />
      <div className="fixed bottom-4 left-4 w-12 h-12 border-b border-l border-white/5 pointer-events-none" />
      <div className="fixed bottom-4 right-4 w-12 h-12 border-b border-r border-white/5 pointer-events-none" />
    </div>
  );
}