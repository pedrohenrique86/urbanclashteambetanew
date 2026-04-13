import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const processAuth = async () => {
      showLoading("Autenticando com Google...");
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const stateParam = params.get("state");

      if (!code) {
        navigate("/?error=google_auth_failed", { replace: true });
        return;
      }

      try {
        const codeVerifier = sessionStorage.getItem("google_code_verifier");
        sessionStorage.removeItem("google_code_verifier");
        sessionStorage.removeItem("google_auth_country");
        sessionStorage.removeItem("google_auth_intent");

        if (!codeVerifier) {
          throw new Error("Verificador de código PKCE não encontrado.");
        }

        const { data: authData } = await api.post("/auth/google/callback", {
          code,
          code_verifier: codeVerifier,
          intent: "login",
          redirect_uri: `${window.location.origin}/auth/google/callback`,
          state: stateParam || undefined,
        });

        if (authData.token) {
          // Apenas faz o login. O UserProfileContext irá recarregar o perfil automaticamente.
          await login(authData.token, authData.user);
          
          // A lógica de redirecionamento foi removida daqui.
          // Após o login, o App será re-renderizado e o ProtectedRoute
          // fará o trabalho de decidir para onde ir, com os dados já carregados.
          // Simplesmente navegamos para o dashboard, e o ProtectedRoute corrige se necessário.
          navigate("/dashboard", { replace: true });

        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        navigate(
          `/?error=${encodeURIComponent(
            e.message || "Erro ao autenticar com Google",
          )}`,
          { replace: true },
        );
      } finally {
        // O hideLoading pode ser chamado aqui, ou o spinner do ProtectedRoute assume.
        hideLoading();
      }
    };

    processAuth();
  }, [location.search, navigate, login, showLoading, hideLoading]);

  // A página de callback não renderiza nada. O spinner global ou do ProtectedRoute cuidam da UX.
  return null;
}