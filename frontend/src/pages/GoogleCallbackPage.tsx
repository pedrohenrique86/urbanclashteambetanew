import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../lib/supabaseClient";
import { useUserProfileContext } from "../contexts/UserProfileContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useUserProfileContext();
  const effectRan = useRef(false);

  useEffect(() => {
    // Previne execução duplicada em StrictMode no desenvolvimento
    if (effectRan.current === true && import.meta.env.DEV) {
      return;
    }
    effectRan.current = true;

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

        // Limpa o storage assim que lê
        sessionStorage.removeItem("google_code_verifier");
        sessionStorage.removeItem("google_auth_country");
        sessionStorage.removeItem("google_auth_intent");

        if (!codeVerifier) {
          throw new Error("Verificador de código PKCE não encontrado. Tente fazer login novamente.");
        }

        const data = await apiClient.googleCallback(
          code,
          codeVerifier,
          "login", // intent padrão — o backend extrai do state se necessário
          `${window.location.origin}/auth/google/callback`,
          country,
          stateParam, // Passa o state para o backend extrair intent e country embedded
        );

        if (data.token) {
          // Sincroniza o perfil no contexto global ANTES de navegar
          // Sem isso, o GlobalLayout pode expulsar o usuário por não ter perfil ainda
          await refreshProfile();

          const redirectTo = data.isFirstLogin
            ? "/faction-selection"
            : "/dashboard";

          navigate(redirectTo, { replace: true });
        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        navigate(`/?error=${encodeURIComponent(e.message || "Erro ao autenticar com Google")}`, { replace: true });
      }
    };

    processAuth();
  }, [location.search, navigate, refreshProfile]);

  // Não renderiza nada — o LoadingSpinner global cobre o período de processamento
  return null;
}
