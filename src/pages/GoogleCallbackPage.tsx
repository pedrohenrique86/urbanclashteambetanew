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
    if (effectRan.current === false) {
      const run = async () => {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const code = params.get("code");
        const next = params.get("next") || "/dashboard";

        try {
          if (token) {
            apiClient.setToken(token);
            // Lógica de perfil e redirecionamento existente...
            // (Esta parte permanece a mesma)
            navigate(next, { replace: true });
            return;
          }

          if (code) {
            setProcessing(true);
            try {
              const intent =
                sessionStorage.getItem("google_auth_intent") || "login";
              const codeVerifier = sessionStorage.getItem(
                "google_code_verifier",
              );
              sessionStorage.removeItem("google_auth_intent");
              sessionStorage.removeItem("google_code_verifier");

              if (!codeVerifier) {
                throw new Error(
                  "Code verifier não encontrado. O fluxo de login pode ter expirado.",
                );
              }

              const res = await fetch(
                (import.meta as any).env.VITE_API_URL + "/auth/google/callback",
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
                let errorData = { error: "Erro desconhecido do servidor." };
                try {
                  errorData = await res.json();
                } catch (e) {
                  // Ignore if response is not json
                }

                if (errorData.error === "google_user_not_found") {
                  setShowRegisterPrompt(true);
                  setProcessing(false);
                  return;
                }

                throw new Error(
                  errorData.error || "Falha na comunicação com o servidor.",
                );
              }

              const data = await res.json();
              if (data.token) {
                apiClient.setToken(data.token);

                // A lógica de redirecionamento agora usa a resposta do backend
                const redirectTo = data.isFirstLogin
                  ? "/faction-selection"
                  : data.next || "/dashboard";

                console.log(
                  `[CALLBACK_DEBUG] Backend disse isFirstLogin: ${data.isFirstLogin}. Redirecionando para: ${redirectTo}`,
                );

                // Forçar o recarregamento da página para garantir que a sessão seja lida
                window.location.href = redirectTo;
              } else {
                throw new Error("Token não recebido do backend");
              }
            } catch (e: any) {
              setError(e.message || "Erro ao processar o login com Google.");
            } finally {
              setProcessing(false);
            }
            return;
          }

          setError(
            "Callback sem credenciais. Tente novamente pelo botão Google.",
          );
        } catch (e: any) {
          setError(e.message || "Falha ao processar o login com Google.");
        } finally {
          setProcessing(false);
        }
      };
      run();
    }

    return () => {
      effectRan.current = true;
    };
  }, [location.search, navigate]);

  // Para evitar o "flash" de um contêiner vazio, só renderizamos a página
  // se houver um erro explícito ou um prompt de registro para mostrar.
  // Caso contrário, retorna nulo, resultando em uma página em branco durante o processamento
  // e redirecionamento.
  if (!showRegisterPrompt && !error) {
    return null;
  }

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} flex items-center justify-center px-4`}
    >
      <div
        className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6 w-full max-w-md text-center`}
      >
        {showRegisterPrompt ? (
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
              className="w-full px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 transition-colors font-bold text-white"
            >
              Voltar
            </button>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="text-yellow-400 font-bold">{error}</div>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors font-bold"
            >
              Voltar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
