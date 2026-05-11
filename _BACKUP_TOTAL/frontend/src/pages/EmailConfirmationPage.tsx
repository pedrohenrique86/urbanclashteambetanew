import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useUserProfileContext } from "../contexts/UserProfileContext";

const EmailConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);
  const { showToast } = useToast();
  const { login } = useAuth();
  const { refreshProfile } = useUserProfileContext();

  useEffect(() => {
    // Evitar execuções múltiplas
    if (hasProcessed) {
      return;
    }

    const confirmEmail = async () => {
      setHasProcessed(true);

      const token = searchParams.get("token");

      if (!token || token.length < 10) {
        showToast("Token inválido ou não encontrado", "error");
        navigate("/");
        return;
      }

      try {
        const { data: response } = await api.post("/auth/confirm-email", { token });

        // Armazenar o token e o usuário no contexto
        if (response.token) {
          await login(response.token, response.user);
        }

        // Sincronizar o perfil
        await refreshProfile();

        // Verificar se é primeiro login para redirecionar para seleção de facção
        if (response.isFirstLogin && response.redirectTo) {
          navigate(response.redirectTo);
        } else {
          // Fallback para home se não houver redirecionamento específico
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
  }, [hasProcessed, searchParams, navigate, showToast, login, refreshProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center">
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
