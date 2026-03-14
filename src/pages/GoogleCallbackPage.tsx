import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const code = params.get("code");
    const next = params.get("next") || "/dashboard";
    const intent = params.get("intent") || "login";

    const run = async () => {
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
            const res = await fetch(
              (import.meta as any).env.VITE_API_URL + "/auth/google/callback",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code,
                  redirect_uri: `${window.location.origin}/auth/google/callback`,
                  intent,
                }),
              },
            );

            if (!res.ok) {
              const errData = await res.json().catch(() => null);
              if (errData?.error === "google_user_not_found") {
                navigate("/?authMode=login&error=google_user_not_found", {
                  replace: true,
                });
              } else {
                throw new Error(errData?.error || "Falha na troca de código");
              }
              return;
            }

            const { token: newToken } = await res.json();
            if (newToken) {
              apiClient.setToken(newToken);
              // Forçar o recarregamento da página para garantir que a sessão seja lida
              window.location.href = next || "/faction-selection";
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
