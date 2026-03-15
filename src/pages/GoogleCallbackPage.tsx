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
  const effectRan = useRef(false);

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
                let errorMsg = "Erro desconhecido do servidor.";
                try {
                  const errData = await res.json();
                  errorMsg = errData.error || JSON.stringify(errData);
                } catch (e) {
                  errorMsg = await res.text();
                }
                throw new Error(errorMsg);
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

                // Adiciona um pequeno delay para melhorar a experiência do usuário
                await new Promise((resolve) => setTimeout(resolve, 1500));

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

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} flex items-center justify-center px-4`}
    >
      <div
        className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6 w-full max-w-md text-center`}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-white font-bold">
              Processando login com Google...
            </div>
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
