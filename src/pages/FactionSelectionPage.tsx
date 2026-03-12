import React, { useState, useEffect } from "react";
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
  const [pageLoading, setPageLoading] = useState(true);
  // Estado de confirmação removido pois não há mais tela de confirmação
  const [factionDetails, setFactionDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Verificar se o usuário está autenticado
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    let safetyTimeoutId: NodeJS.Timeout;

    // Timeout de segurança para evitar loop infinito de carregamento
    safetyTimeoutId = setTimeout(() => {
      console.log("Timeout de segurança acionado, redirecionando para home");
      setError("Tempo limite excedido. Por favor, faça login novamente.");
      // Forçar redirecionamento após 10 segundos se a página continuar carregando
      setPageLoading(false); // Parar o carregamento para mostrar o erro
      // Não redirecionamos automaticamente para permitir que o usuário veja a mensagem
    }, 10000); // 10 segundos de timeout

    const checkUser = async () => {
      try {
        // Aguardar um pouco para a sessão ser estabelecida após redirecionamento
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verificar se o usuário está autenticado
        const {
          data: { user },
          error,
        } = await apiClient.getCurrentUser();

        if (error || !user) {
          console.log("Usuário não autenticado ou erro:", error);
          // Limpar o timeout de segurança
          if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
          // Mostrar erro e parar carregamento
          setError("Você precisa estar logado para acessar esta página.");
          setPageLoading(false);
          return;
        }

        // Verificar se o usuário já tem uma facção selecionada
        try {
          const profileData = await apiClient.getUserProfile();

          // Se já tiver facção, redirecionar para o dashboard
          if (profileData?.faction) {
            console.log(
              "Usuário já tem facção selecionada:",
              profileData.faction,
              "redirecionando para dashboard"
            );
            // Limpar o timeout de segurança
            if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
            window.location.href = "/dashboard";
            return;
          }

          // Se chegou aqui, o usuário está autenticado mas não tem facção
          // Limpar o timeout de segurança e mostrar a tela de seleção
          if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
          setPageLoading(false);
        } catch (profileCheckError: any) {
          // Se o erro for 404 (perfil não encontrado), isso é esperado para novos usuários
          if (profileCheckError.message?.includes('404') || profileCheckError.message?.includes('Perfil não encontrado')) {
            console.log("👤 Novo usuário detectado - perfil será criado na seleção de facção");
          } else {
            console.error(
              "Erro ao verificar perfil do usuário:",
              profileCheckError
            );
          }
          // Limpar o timeout de segurança
          if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
          // Mesmo com erro, vamos tentar mostrar a tela de seleção
          setPageLoading(false);
        }
      } catch (error) {
        console.error("Erro ao verificar usuário:", error);
        // Limpar o timeout de segurança
        if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
        setError("Erro ao verificar autenticação. Por favor, tente novamente.");
        setPageLoading(false);
      }
    };

    // Listener removido - não necessário com API local

    checkUser();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
    };
  }, [navigate]);

  const handleFactionSelect = async () => {
    if (!selectedFaction || processing) {
      if (!selectedFaction) setError("Por favor, selecione uma facção.");
      return;
    }

    setProcessing(true);
    setLoading(true);
    setError(null);
    
    // Delay inicial para mostrar processamento
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      console.log(`🎯 Iniciando seleção de facção: ${selectedFaction}`);

      // Obter o usuário atual
      const {
        data: { user },
        error: userError,
      } = await apiClient.getCurrentUser();

      if (userError || !user) {
        throw new Error(
          "Usuário não autenticado. Por favor, faça login novamente."
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
          if (profileError.message?.includes('Perfil não encontrado') || profileError.message?.includes('404')) {
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("🔄 Redirecionando para seleção de clãs...");
        navigate("/clan-selection", { state: { faction: selectedFaction } });
      } catch (profileError: any) {
        console.error("❌ Erro detalhado:", profileError);
        console.log("Resposta da API:", profileError.response);
        throw new Error(
          `Erro ao salvar facção: ${
            profileError.message || "Erro desconhecido"
          }`
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

  // Mostrar um indicador de carregamento enquanto verifica o usuário
  if (pageLoading) {
    return <LoadingScreen error={error} pageLoading={pageLoading} />;
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
            loading={loading}
            processing={processing}
            onConfirm={handleFactionSelect}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
