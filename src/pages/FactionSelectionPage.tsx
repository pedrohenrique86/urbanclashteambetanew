import React, { useState, useEffect } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/supabaseClient";
import {
  LoadingScreen,
  BackgroundEffects,
  FactionHeader,
  FactionCard,
  ConfirmButton,
} from "../components/faction";

export default function FactionSelectionPage() {
  const [selectedFaction, setSelectedFaction] = useState<
    "gangsters" | "guardas" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  // O estado pageLoading foi removido para usar profileLoading do hook como fonte única da verdade.
  const [factionDetails, setFactionDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const { userProfile: profile, loading: profileLoading } = useUserProfile();

  const handleFactionSelect = async () => {
    // Trava de segurança para previnir condição de corrida
    if (profileLoading || processing) {
      setError("Aguarde a verificação do seu perfil antes de continuar.");
      return;
    }

    const {
      data: { user },
    } = await apiClient.getCurrentUser();
    if (!user) {
      setError("Sessão de usuário inválida. Por favor, recarregue a página.");
      return;
    }

    if (!selectedFaction) {
      setError("Por favor, selecione uma facção.");
      return;
    }

    setProcessing(true);
    setLoading(true);
    setError(null);

    // Delay inicial para mostrar processamento
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      console.log(`🎯 Iniciando seleção de facção: ${selectedFaction}`);

      // Obter o usuário atual
      const {
        data: { user },
        error: userError,
      } = await apiClient.getCurrentUser();

      if (userError || !user) {
        throw new Error(
          "Usuário não autenticado. Por favor, faça login novamente.",
        );
      }

      console.log(`👤 Usuário autenticado: ${user.email}`);

      // Verificar se já tem perfil
      try {
        let existingProfile;
        try {
          existingProfile = await apiClient.getUserProfile();
        } catch (profileError: any) {
          // Se perfil não existe (404), isso é esperado para novos usuários
          if (
            profileError.message?.includes("Perfil não encontrado") ||
            profileError.message?.includes("404")
          ) {
            console.log("👤 Perfil não existe, será criado um novo");
            existingProfile = null;
          } else {
            console.error("Erro inesperado ao verificar perfil:", profileError);
            throw profileError;
          }
        }

        if (existingProfile?.faction) {
          console.log(`⚠️ Usuário já tem facção: ${existingProfile.faction}`);
          navigate("/dashboard");
          return;
        }

        // Atualizar perfil existente ou criar novo
        if (existingProfile) {
          console.log("📝 Atualizando perfil existente com nova facção...");
          await apiClient.updateUserProfile({ faction: selectedFaction });
        } else {
          // Criar novo perfil
          console.log("🆕 Criando novo perfil...");
          await apiClient.createUserProfile({
            faction: selectedFaction,
            username:
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              "Usuário",
          });
        }

        console.log(`✅ Facção ${selectedFaction} selecionada com sucesso!`);

        // Delay adicional antes de redirecionar
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("🔄 Redirecionando para seleção de clãs...");
        navigate("/clan-selection", { state: { faction: selectedFaction } });
      } catch (profileError: any) {
        console.error("❌ Erro detalhado:", profileError);
        console.log("Resposta da API:", profileError.response);
        throw new Error(
          `Erro ao salvar facção: ${
            profileError.message || "Erro desconhecido"
          }`,
        );
      }
    } catch (error: any) {
      console.error("❌ Erro na seleção de facção:", error);
      setError(error.message || "Erro ao selecionar facção. Tente novamente.");
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  // Função de confirmação removida pois a seleção é feita diretamente

  // Mostrar um indicador de carregamento enquanto o perfil do usuário é verificado pelo hook
  if (profileLoading) {
    return <LoadingScreen error={error} pageLoading={profileLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background com efeito de gradiente animado */}
      <BackgroundEffects selectedFaction={selectedFaction} />

      {/* Conteúdo principal */}
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
            loading={loading || profileLoading || processing}
            processing={processing}
            onConfirm={handleFactionSelect}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
