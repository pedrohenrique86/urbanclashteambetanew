import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { invalidateUserProfile } from "../hooks/useUserProfile";

const EmailConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Evitar execuções múltiplas
    if (hasProcessed) {
      return;
    }

    const confirmEmail = async () => {
      setHasProcessed(true);

      const token = searchParams.get("token");
      console.log("🎫 Processando confirmação de email com token:", token);

      if (!token || token.length < 10) {
        console.log(
          "❌ Token inválido ou não encontrado, redirecionando para home",
        );
        showToast("Token inválido ou não encontrado", "error");
        navigate("/");
        return;
      }

      try {
        console.log("🔍 Confirmando email com token:", token);

        const response = await apiClient.confirmEmail(token);

        console.log("✅ Email confirmado com sucesso");

        // Armazenar o token e invalidar o cache para forçar a atualização
        if (response.token) {
          console.log("🔑 Token recebido, salvando...");
          apiClient.setToken(response.token); // Salva o token no localStorage
        }

        // Invalida o cache do perfil para forçar a atualização dos dados
        invalidateUserProfile();

        // Verificar se é primeiro login para redirecionar para seleção de facção
        if (response.isFirstLogin && response.redirectTo) {
          console.log("🔄 Redirecionando para seleção de facção...");
          navigate(response.redirectTo);
        } else {
          // Fallback para home se não houver redirecionamento específico
          console.log("🔄 Redirecionando para home...");
          navigate("/");
        }
      } catch (error: any) {
        console.error("❌ Erro na confirmação de email:", error);
        showToast(
          "Erro ao confirmar email. Por favor, tente novamente.",
          "error",
        );
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [hasProcessed, searchParams, navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      {isLoading && (
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">
            Confirmando Email
          </h2>
          <p className="text-gray-300">
            Aguarde enquanto confirmamos seu email...
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailConfirmationPage;
