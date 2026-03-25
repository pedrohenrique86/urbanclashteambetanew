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

      // Tenta criar o perfil. Se já existir, apenas atualiza a facção.
      try {
        // Primeiro, verifica se o usuário já tem uma facção para evitar reescrevê-la.
        // Usamos o perfil já carregado pelo hook `useUserProfile`.
        if (profile?.faction) {
          console.log(
            `⚠️ Usuário já tem facção: ${profile.faction}. Redirecionando...`,
          );
          navigate("/dashboard");
          return; // Interrompe a execução para não continuar o processo
        }

        // Se não tem facção, tenta criar um perfil completo.
        // Isso pode falhar se o perfil (linha na tabela) já existir mas sem facção.
        console.log("🆕 Tentando criar um novo perfil para o usuário...");
        await apiClient.createUserProfile({
          faction: selectedFaction,
          username:
            user.user_metadata?.username ||
            user.email?.split("@")[0] ||
            "Usuário",
        });
        console.log("✅ Perfil criado e facção selecionada com sucesso!");
      } catch (creationError: any) {
        // Ajustado para a mensagem de erro real da API
        const isDuplicateProfile =
          creationError.message?.includes("Perfil já existe");

        if (isDuplicateProfile) {
          console.log(
            "⚠️ Perfil já existente detectado. Tentando atualizar a facção...",
          );
          try {
            // Atualiza o perfil existente com a facção selecionada.
            await apiClient.updateUserProfile(user.id, {
              faction: selectedFaction,
            });
            console.log(
              "✅ Facção atualizada com sucesso no perfil existente!",
            );
          } catch (updateError: any) {
            console.error(
              "❌ Erro crítico ao TENTAR ATUALIZAR o perfil:",
              updateError,
            );
            throw new Error(
              `O perfil já existe, mas falhou ao atualizar a facção: ${
                updateError.message || "Erro desconhecido"
              }`,
            );
          }
        } else {
          // Se o erro não for de duplicidade, é um problema inesperado.
          console.error("❌ Erro inesperado ao CRIAR o perfil:", creationError);
          throw creationError; // Lança o erro original para ser tratado pelo catch externo.
        }
      }

      console.log(`✅ Processo de facção (${selectedFaction}) concluído.`);

      // Delay adicional para feedback visual antes de redirecionar
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("🔄 Redirecionando para a seleção de clãs...");
      navigate("/clan-selection", { state: { faction: selectedFaction } });
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
