import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLoading } from "../contexts/LoadingContext";
import { useUserProfileContext } from "../contexts/UserProfileContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const { loading: isProfileLoading } = useUserProfileContext();
  const hasProcessed = useRef(false);
  const [authComplete, setAuthComplete] = useState(false);

  // Monitora quando o perfil termina de carregar após o login, para remover o spinner suavemente
  useEffect(() => {
    if (authComplete && !isProfileLoading) {
      hideLoading();
      navigate("/dashboard", { replace: true });
    }
  }, [authComplete, isProfileLoading, hideLoading, navigate]);

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
          // Apenas faz o login. O UserProfileContext irá começar a recarregar o perfil automaticamente.
          await login(authData.token, authData.refreshToken, authData.user);
          
          // Libera o estado para que o outro useEffect espere o carregamento do perfil
          setAuthComplete(true);

        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        hideLoading(); // Só esconde em caso de erro. O fluxo de sucesso é controlado pelo outro useEffect.
        navigate(
          `/?error=${encodeURIComponent(
            e.message || "Erro ao autenticar com Google",
          )}`,
          { replace: true },
        );
      }
    };

    processAuth();
  }, [location.search, navigate, login, showLoading, hideLoading]);

  // A página de callback não renderiza nada. O spinner global ou do ProtectedRoute cuidam da UX.
  return null;
}