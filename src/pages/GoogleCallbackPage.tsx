import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const effectRan = useRef(false);

  // NOTE: This handler duplicates logic from AuthModal.tsx.
  // This should be refactored into a shared hook or utility for the PKCE flow.
  const handleGoogleRegister = async () => {
    const generateRandomString = (length: number) => {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }
      return result;
    };
    const sha256 = (plain: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return window.crypto.subtle.digest("SHA-256", data);
    };
    const base64urlencode = (a: ArrayBuffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(a)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    };

    setProcessing(true);
    try {
      const verifier = generateRandomString(128);
      const challengeBuffer = await sha256(verifier);
      const challenge = base64urlencode(challengeBuffer);

      sessionStorage.setItem("google_code_verifier", verifier);
      sessionStorage.setItem("google_auth_intent", "register");

      const startUrl = `${
        (import.meta as any).env.VITE_API_URL
      }/auth/google/start?code_challenge=${challenge}&code_challenge_method=S256&intent=register`;
      window.location.href = startUrl;
    } catch (e) {
      setError("Falha ao iniciar o registro com Google. Tente novamente.");
      setProcessing(false);
    }
  };

  useEffect(() => {
    // O effectRan previne a execução duplicada em modo de desenvolvimento com StrictMode
    if (effectRan.current === true && import.meta.env.DEV) {
      return;
    }
    effectRan.current = true;

    const processAuth = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");

      // Se não houver código, não há o que fazer.
      if (!code) {
        setError("Código de autorização não encontrado na URL.");
        // Em caso de erro real, podemos redirecionar para a página de login com uma mensagem
        navigate("/?error=google_auth_failed", { replace: true });
        return;
      }

      try {
        const intent = sessionStorage.getItem("google_auth_intent") || "login";
        const codeVerifier = sessionStorage.getItem("google_code_verifier");

        sessionStorage.removeItem("google_auth_intent");
        sessionStorage.removeItem("google_code_verifier");

        if (!codeVerifier) {
          throw new Error("Verificador de código PKCE não encontrado.");
        }

        const res = await fetch(
          `${(import.meta as any).env.VITE_API_URL}/api/auth/google/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/auth/google/callback`,
              intent,
              code_verifier: codeVerifier,
            }),
          },
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          // Se o usuário não existe, redireciona para o registro
          if (errorData?.error === "google_user_not_found") {
            setShowRegisterPrompt(true);
            return; // Interrompe para mostrar o prompt de registro
          }
          throw new Error(
            errorData?.error || "Falha na autenticação com Google.",
          );
        }

        const data = await res.json();
        if (data.token) {
          apiClient.setToken(data.token);

          // Lógica de redirecionamento corrigida e final:
          // Se não é o primeiro login, vai direto para o dashboard.
          const redirectTo = data.isFirstLogin
            ? "/faction-selection"
            : "/dashboard";

          navigate(redirectTo, { replace: true });
        } else {
          throw new Error("Token de autenticação não recebido.");
        }
      } catch (e: any) {
        setError(e.message);
        // Em caso de erro, redireciona para a home com uma mensagem
        navigate(`/?error=${encodeURIComponent(e.message)}`, { replace: true });
      }
    };

    processAuth();
  }, [location.search, navigate]);

  // Se o usuário não estiver cadastrado, mostramos um prompt para se registrar.
  if (showRegisterPrompt) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex items-center justify-center px-4`}
      >
        <div
          className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6 w-full max-w-md text-center`}
        >
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">
              Usuário não cadastrado
            </h2>
            <p className={`${themeClasses.textSecondary}`}>
              Para fazer login, primeiro você precisa se registrar com sua conta
              Google.
            </p>
            <button
              onClick={handleGoogleRegister}
              className="w-full px-4 py-2 rounded bg-green-600 hover:bg-green-500 transition-colors font-bold text-white"
            >
              Clique aqui para se registrar
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 transition-colors font-bold text-white mt-2"
            >
              Voltar para o Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // A página não renderiza nada durante o processamento, ficando em branco.
  return null;
}
