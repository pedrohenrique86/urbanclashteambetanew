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

    const run = async () => {
      try {
        if (token) {
          apiClient.setToken(token);
          try {
            const profile = await apiClient.getUserProfile();
            const hasCountry = !!(profile?.country || profile?.country_code);
            if (!hasCountry) {
              let codeGuess = "";
              try {
                const lang =
                  navigator.language ||
                  (Array.isArray(navigator.languages)
                    ? navigator.languages[0]
                    : "") ||
                  "";
                const parts = lang.split("-");
                codeGuess = parts.length > 1 ? parts[1].toUpperCase() : "US";
              } catch {
                codeGuess = "US";
              }
              try {
                await apiClient.updateUserProfile({ country: codeGuess });
              } catch {}
            }
            if (!profile?.faction) {
              showToast("Conta criada com Google. Selecione sua facção.", "info", 4000);
              navigate("/faction-selection", { replace: true });
              return;
            }
            if (!profile?.clan_id) {
              showToast("Escolha um clã para continuar.", "info", 4000);
              navigate("/clan-selection", { state: { faction: profile.faction }, replace: true });
              return;
            }
          } catch {
            showToast("Conta criada com Google. Selecione sua facção.", "info", 4000);
            navigate("/faction-selection", { replace: true });
            return;
          }
          navigate(next, { replace: true });
          return;
        }
        if (code) {
          setError(
            "Callback recebido. Aguarde o backend concluir a troca do código."
          );
          setProcessing(false);
          return;
        }
        setError(
          "Callback sem credenciais. Tente novamente pelo botão Google."
        );
      } catch {
        setError("Falha ao processar o login com Google.");
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
