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
  ConfirmButton,
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
  const { refreshProfile } = useUserProfileContext();

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

    // Adiciona um delay para melhorar a UX
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      console.log(`🎯 Iniciando seleção de facção: ${selectedFaction}`);

      if (!user) {
        throw new Error(
          "Usuário não autenticado. Por favor, faça login novamente.",
        );
      }

      console.log(`👤 Usuário autenticado: ${user.email}`);

      if (profile?.faction) {
        console.log(
          `⚠️ Usuário já tem facção: ${profile.faction}. Redirecionando para dashboard...`,
        );
      } else {
        try {
          console.log("🆕 Tentando criar um novo perfil para o usuário...");
          await api.post("/users/profile", {
            faction: selectedFaction,
            username:
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              "Usuário",
          });
          console.log("✅ Perfil criado e facção selecionada com sucesso!");
        } catch (creationError: any) {
          const isDuplicateProfile =
            creationError.response?.status === 409 || 
            creationError.message?.includes("Perfil já existe");

          if (isDuplicateProfile) {
            console.log(
              "⚠️ Perfil já existente detectado. Tentando atualizar a facção...",
            );
            await api.put(`/users/${user.id}/profile`, {
              faction: selectedFaction,
            });
            console.log(
              "✅ Facção atualizada com sucesso no perfil existente!",
            );
          } else {
            throw creationError;
          }
        }
      }

      console.log(`✅ Processo de facção (${selectedFaction}) concluído.`);
      await refreshProfile();
      hideLoading();
      console.log("🔄 Redirecionando para a dashboard...");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("❌ Erro na seleção de facção:", error);
      setError(error.message || "Erro ao selecionar facção. Tente novamente.");
      hideLoading();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
      <BackgroundEffects selectedFaction={selectedFaction} />

      <AnimatePresence>
        <motion.div
          key="selection"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-4xl"
        >
          <FactionHeader />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <FactionCard
              faction="gangsters"
              selectedFaction={selectedFaction}
              onSelect={setSelectedFaction}
            />
            <FactionCard
              faction="guardas"
              selectedFaction={selectedFaction}
              onSelect={setSelectedFaction}
            />
          </div>

          <ConfirmButton
            selectedFaction={selectedFaction}
            onConfirm={handleFactionSelect}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}