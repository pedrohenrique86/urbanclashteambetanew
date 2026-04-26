import React, { useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import DashboardSidebar from "./DashboardSidebar";
import { MobileAppDrawer } from "./MobileAppDrawer";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfileContext } from "../../contexts/UserProfileContext";
import { useHUD } from "../../contexts/HUDContext";
import { Tooltip } from "react-tooltip";
import ScrollToTopButton from "./ScrollToTopButton";
import DigitalIdentityModal from "../DigitalIdentityModal";
import ClanIdentityModal from "../ClanIdentityModal";
import { DynamicBackground } from "./DynamicBackground";
import { PAGE_BACKGROUNDS } from "../../constants/backgrounds";
import StatusBlocker from "../StatusBlocker";
import { useToast } from "../../contexts/ToastContext";
import { trainingService } from "../../services/trainingService";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { userProfile, handleLogout, refreshProfile } = useUserProfileContext();
  const { currentPanel, closePanel, clearPanels, hasOpenPanel } = useHUD();
  const { showToast } = useToast();
  const completingRef = useRef(false);

  // SÊNIOR: Lógica de exibição do Blocker (Oculta se estiver na página de destino do status)
  const status = userProfile?.status || 'Operacional';
  const path = location.pathname;

  const hideBlocker = (
    (status === 'Operacional') ||
    (status === 'Aprimoramento') || // Usuário solicitou remover overlay para treino
    (status === 'Isolamento' && path === '/isolation') ||
    (status === 'Recondicionamento' && path === '/recovery-base')
  );

  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const pagesWithoutNav = [
    "/",
    "/faction",
    "/faction-selection",
    "/clan-selection",
    "/confirm-email",
    "/reset-password",
    "/auth/google/callback",
  ];

  const shouldShowNav = !pagesWithoutNav.some(
    (p) => location.pathname === p || location.pathname.startsWith("/auth/"),
  );

  // SÊNIOR: Efeito global de conclusão de treinamento. Conclui em background onde quer que o jogador esteja.
  useEffect(() => {
    if (!userProfile?.training_ends_at || !userProfile?.active_training_type) {
      completingRef.current = false; // Reset da trava de conclusão quando não houver treino ativo
      return;
    }
    const endsAtMs = new Date(userProfile.training_ends_at).getTime();
    if (isNaN(endsAtMs)) return;

    const tick = async () => {
      // 1 segundo de tolerância adicionado ao clock skew
      const remaining = Math.max(0, Math.floor((endsAtMs - Date.now() + 1000) / 1000));
      if (remaining === 0 && !completingRef.current) {
        completingRef.current = true;
        try {
          const res = await trainingService.completeTraining();
          showToast(
            `${res.message} [ +${res.gains.attack} ATK, +${res.gains.defense} DEF, +${res.gains.focus} FOC, +${res.gains.xp} XP ]`,
            "success",
            7000
          );
          // O perfil será atualizado via SSE e na próxima rodada este useEffect limpará o completingRef
        } catch (err: any) {
          const httpStatus = err.response?.status;
          console.warn("[GlobalLayout] Treino background erro/ignorado:", err.response?.data?.error || err.message);
          
          if (httpStatus === 400 || httpStatus === 404) {
             // Erro 400 frequentemente indica "O treinamento ainda não terminou" (skew) ou "Nenhum ativo"
             // Caso já tenha concluído, forcamos um refresh pra sincronizar a interface se o SSE falhou.
             setTimeout(() => { refreshProfile().finally(() => { completingRef.current = false; }) }, 5000);
          } else {
             // Para outros erros (ex: 500, network), liberamos rapidamente
             setTimeout(() => { completingRef.current = false; }, 3000);
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 2000);
    return () => clearInterval(timer);
  }, [userProfile?.training_ends_at, userProfile?.active_training_type, showToast, refreshProfile]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && hasOpenPanel) {
        closePanel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePanel, hasOpenPanel]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (shouldShowNav) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [shouldShowNav]);

  useEffect(() => {
    clearPanels();
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, clearPanels]);

  useEffect(() => {
    if (!hasOpenPanel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [hasOpenPanel]);

  if (!shouldShowNav) {
    const hasDynamicBg = !!PAGE_BACKGROUNDS[location.pathname];
    return (
      <div className={`min-h-screen font-exo text-white ${hasDynamicBg ? "" : themeClasses.bg} flex flex-col relative`}>
        <DynamicBackground />
        {!hideBlocker && <StatusBlocker />}
        <main className="flex-1 relative z-10 overflow-y-auto">
          {children}
        </main>
        <ScrollToTopButton />
      </div>
    );
  }

  const isDashboard = location.pathname === "/dashboard";
  const hasDynamicBackground = !!PAGE_BACKGROUNDS[location.pathname];
  
  return (
    <div
      className={`h-screen font-exo text-white ${hasDynamicBackground ? "" : themeClasses.bg} overflow-hidden flex flex-col`}
    >
      <DynamicBackground />
      {!hideBlocker && <StatusBlocker />}
      <div
        className={`flex flex-1 overflow-hidden ${isDashboard ? "bg-black/20" : ""
          }`}
      >
        <div className="hidden md:flex md:flex-shrink-0 z-20 h-full">
          <DashboardSidebar
            username={userProfile?.username}
            faction={
              (userProfile?.faction?.name || userProfile?.faction) as
              | "gangsters"
              | "guardas"
              | undefined
            }
            handleLogout={handleLogout}
            isAdmin={userProfile?.is_admin}
          />
        </div>

        <div className="flex flex-col flex-1 w-0">
          <div
            ref={scrollableContainerRef}
            className="flex-1 relative overflow-y-auto overflow-x-hidden"
          >
            <TopBar
              userProfile={userProfile as any}
            />

            <main className="focus:outline-none pt-2 md:pt-4 px-4 md:px-6 pb-[60px] md:pb-6 relative z-10 w-full">
              <div className="urban-container">
                {children}
              </div>
            </main>

            {currentPanel?.type === "user" && (
              <DigitalIdentityModal
                userId={currentPanel.id}
                onClose={closePanel}
              />
            )}

            {currentPanel?.type === "clan" && (
              <ClanIdentityModal
                clanId={currentPanel.id}
                onClose={closePanel}
              />
            )}
          </div>
        </div>
      </div>

      <Tooltip
        id="server-time-tooltip"
        place="top-end"
        style={{ zIndex: 99999 }}
        className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans"
      />
      <Tooltip
        id="game-clock-tooltip"
        place="top-end"
        style={{ zIndex: 99999 }}
        className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans"
      />

      <MobileAppDrawer />
      <ScrollToTopButton scrollableRef={scrollableContainerRef} />
    </div>
  );
};

export default GlobalLayout;