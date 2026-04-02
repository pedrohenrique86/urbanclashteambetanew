import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { useUserProfileContext } from "../contexts/UserProfileContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { showToast } = useToast();
  const { refreshProfile } = useUserProfileContext();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);
  const effectRan = useRef(false);

  useEffect(() => {
    // O effectRan previne a execução duplicada em modo de desenvolvimento com StrictMode
    if (effectRan.current === true && import.meta.env.DEV) {
      return;
    }
    effectRan.current = true;

    const processAuth = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");

      if (!code) {
        setError("Código de autorização não encontrado na URL.");
        navigate("/?error=google_auth_failed", { replace: true });
        return;
      }

      try {
        const intent = sessionStorage.getItem("google_auth_intent") || "login";
        const codeVerifier = sessionStorage.getItem("google_code_verifier");
        const country = sessionStorage.getItem("google_auth_country");

        // Limpa o storage imediatamente para segurança
        sessionStorage.removeItem("google_auth_intent");
        sessionStorage.removeItem("google_code_verifier");
        sessionStorage.removeItem("google_auth_country");

        if (!codeVerifier) {
          throw new Error("Verificador de código PKCE não encontrado.");
        }

        const data = await apiClient.googleCallback(
          code,
          codeVerifier,
          intent,
          `${window.location.origin}/auth/google/callback`,
          country,
        );

        if (data.token) {
          // IMPORTANT: Sincronizar o perfil global ANTES de navegar.
          // Isso garante que o UserProfileProvider já esteja em estado de "loading" ou com dados
          // quando o usuário atingir o Dashboard, evitando o redirecionamento para a Home.
          await refreshProfile();

          const redirectTo = data.isFirstLogin
            ? "/faction-selection"
            : "/dashboard";

          navigate(redirectTo, { replace: true });
        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        setError(e.message);
        navigate(`/?error=${encodeURIComponent(e.message)}`, { replace: true });
      }
    };

    processAuth();
  }, [location.search, navigate, refreshProfile]);

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-purple-500 border-r-2 border-transparent"></div>
        <p className="text-purple-400 font-medium animate-pulse">Autenticando com Google...</p>
      </div>
    </div>
  );
}
