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
      if (!user) {
        throw new Error(
          "Usuário não autenticado. Por favor, faça login novamente.",
        );
      }

      if (!profile?.faction) {
        try {
          await api.post("/users/profile", {
            faction: selectedFaction,
            username:
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              "Usuário",
          });
        } catch (creationError: any) {
          const isDuplicateProfile =
            creationError.response?.status === 409 || 
            creationError.message?.includes("Perfil já existe");

          if (isDuplicateProfile) {
            await api.put(`/users/${user.id}/profile`, {
              faction: selectedFaction,
            });
          } else {
            throw creationError;
          }
        }
      }
      await refreshProfile();
      hideLoading();
      navigate("/dashboard");
    } catch (error: any) {
      console.error("❌ Erro na seleção de facção:", error);
      setError(error.message || "Erro ao selecionar facção. Tente novamente.");
      hideLoading();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start md:justify-center p-8 py-12 md:py-8 overflow-y-auto relative custom-scrollbar">
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

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0 mb-10 relative">
            {/* Lado Esquerdo - Renegados */}
            <div className="w-full md:flex-1">
              <FactionCard
                faction="gangsters"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
              />
            </div>

            {/* Centro - Botão de Confirmação */}
            <div className="z-30 md:mx-[-20px]">
              <ConfirmButton
                selectedFaction={selectedFaction}
                onConfirm={handleFactionSelect}
              />
            </div>

            {/* Lado Direito - Guardiões */}
            <div className="w-full md:flex-1">
              <FactionCard
                faction="guardas"
                selectedFaction={selectedFaction}
                onSelect={setSelectedFaction}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}