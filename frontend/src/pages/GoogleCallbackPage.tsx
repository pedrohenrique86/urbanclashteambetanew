import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useLoading } from "../contexts/LoadingContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useUserProfileContext();
  const { login } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Garante que o processo de autenticação rode apenas uma vez.
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const processAuth = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      // O Google retorna o 'state' como query param após o redirect
      const stateParam = params.get("state");

      if (!code) {
        navigate("/?error=google_auth_failed", { replace: true });
        return;
      }

      try {
        const codeVerifier = sessionStorage.getItem("google_code_verifier");
        const country = sessionStorage.getItem("google_auth_country");

        // Limpa o storage assim que lê para evitar reuso
        sessionStorage.removeItem("google_code_verifier");
        sessionStorage.removeItem("google_auth_country");
        sessionStorage.removeItem("google_auth_intent");

        if (!codeVerifier) {
          throw new Error(
            "Verificador de código PKCE não encontrado. Tente fazer login novamente.",
          );
        }

        const { data: authData } = await api.post("/auth/google/callback", {
          code,
          code_verifier: codeVerifier,
          intent: "login",
          redirect_uri: `${window.location.origin}/auth/google/callback`,
          country: country || undefined,
          state: stateParam || undefined,
        });

        if (authData.token) {
          // Registra o token e o usuário no contexto de autenticação
          // O login() agora lida com o fallback de buscar o user se userData for nulo
          await login(authData.token, authData.user);

          // Define a mensagem do spinner com base no status de login
          const loadingMessage = authData.isFirstLogin
            ? "Verificando perfil..."
            : "Carregando dashboard...";
          showLoading(loadingMessage);

          // Garante que o spinner fique visível por 3 segundos
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Sincroniza o perfil no contexto global ANTES de navegar
          await refreshProfile();

          const redirectTo = authData.isFirstLogin
            ? "/faction-selection"
            : "/dashboard";

          hideLoading();
          navigate(redirectTo, { replace: true });
        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        hideLoading();
        navigate(
          `/?error=${encodeURIComponent(
            e.message || "Erro ao autenticar com Google",
          )}`,
          { replace: true },
        );
      }
    };

    processAuth();
  }, [location.search, navigate, refreshProfile, showLoading, hideLoading, login]);

  // Não renderiza nada — o LoadingSpinner global cobre o período de processamento
  return null;
}