import React, { useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import DashboardSidebar from "./DashboardSidebar";
import { MobileAppDrawer } from "./MobileAppDrawer";
import RightPlayerSidebar from "./RightPlayerSidebar";
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
import LiveNewsTicker from "./LiveNewsTicker";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { userProfile, handleLogout, refreshProfile, setUserProfile } = useUserProfileContext();
  const { currentPanel, closePanel, clearPanels, hasOpenPanel } = useHUD();
  const { showToast } = useToast();
  const completingRef = useRef(false);
  const prevStatusRef = useRef<string | null>(null);

  // Estabiliza props do sidebar — evita re-render quando XP/dinheiro mudam
  const sidebarUsername = useMemo(() => userProfile?.username, [userProfile?.username]);
  const sidebarFaction = useMemo(
    () => (userProfile?.faction?.name || userProfile?.faction) as "gangsters" | "guardas" | undefined,
    [userProfile?.faction]
  );
  const sidebarIsAdmin = useMemo(() => userProfile?.is_admin, [userProfile?.is_admin]);

  // SÊNIOR: Lógica de exibição do Blocker (Oculta se estiver na página de destino do status)
  const status = userProfile?.status || 'Operacional';
  const path = location.pathname;

  const hideBlocker = (
    (status === 'Operacional') ||
    (status === 'Aprimoramento') || // Usuário solicitou remover overlay para treino
    (status === 'Ruptura') ||
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
    if (userProfile?.pending_training_toast) {
      const g = userProfile.pending_training_toast;
      showToast(
        `SUCESSO! +${g.attack} ATK | +${g.defense} DEF | +${g.focus} FOC | +${g.xp} XP`,
        "success",
        3000
      );
      // Limpa o toast no estado React para não disparar novamente em re-renders
      setUserProfile((prev) =>
        prev ? { ...prev, pending_training_toast: null } : prev
      );
    }
  }, [userProfile?.pending_training_toast, showToast, setUserProfile]);

  // SÊNIOR: Monitor de Mudança de Status (Feedback Narrativo)
  const currentStatus = userProfile?.status || 'Operacional';
  const pendingTrainingToast = userProfile?.pending_training_toast;

  useEffect(() => {
    if (!userProfile) return;
    
    const prevStatus = prevStatusRef.current;

    if (prevStatus === null) {
      prevStatusRef.current = currentStatus;
      if (currentStatus === 'Ruptura' && !sessionStorage.getItem('bleeding_toast_shown')) {
        showToast("ALERTA: Integridade comprometida. Ruptura de sistema detectada. Visite a Unidade de Manutenção.", "error", 3000);
        sessionStorage.setItem('bleeding_toast_shown', 'true');
      }
      return;
    }

    if (prevStatus !== currentStatus) {
      prevStatusRef.current = currentStatus;

      let message = '';
      let type: 'success' | 'error' | 'warning' | 'info' = 'info';

      switch (currentStatus) {
        case 'Ruptura':
          if (!sessionStorage.getItem('bleeding_toast_shown')) {
            message = "⚠️ ALERTA: Ruptura detectada! Sua unidade está perdendo integridade estrutural. Vá à Unidade de Manutenção.";
            type = 'error';
            sessionStorage.setItem('bleeding_toast_shown', 'true');
          }
          break;
        case 'Isolamento':
          message = "🔒 DETENÇÃO: Protocolo de Isolamento ativado. Acesso restrito a sistemas críticos.";
          type = 'error';
          break;
        case 'Recondicionamento':
          {
            const reason = (userProfile as any)?.reconReason || "Iniciando protocolo de reparo.";
            const phrase = (userProfile as any)?.reconPhrase ? `\n"${(userProfile as any).reconPhrase}"` : "";
            const lossCredits = (userProfile as any)?.reconLossCredits ? `\n💸 -$${(userProfile as any).reconLossCredits}` : "";
            const lossXp = (userProfile as any)?.reconLossXp ? `\n📉 -${(userProfile as any).reconLossXp} XP` : "";
            const power = (userProfile as any)?.reconPowerResult ? `\n📊 ${(userProfile as any).reconPowerResult}` : "";
            
            message = `🛠️ RECON: ${reason}${phrase}${lossCredits}${lossXp}${power}`;
            type = 'warning';
          }
          break;
        case 'Aprimoramento':
          message = "⚡ SISTEMA: Sequência de aprimoramento físico/neural em curso.";
          type = 'info';
          break;
        case 'Operacional':
          sessionStorage.removeItem('bleeding_toast_shown');
          if (prevStatus === 'Aprimoramento' && pendingTrainingToast) return;
          if (['Ruptura', 'Recondicionamento', 'Isolamento', 'Aprimoramento'].includes(prevStatus)) {
            message = "✅ SISTEMA: Estabilização concluída. Status operacional restaurado.";
            type = 'success';
          }
          break;
      }

      if (message) {
        showToast(message, type, 3000);
      }
    }
  }, [currentStatus, pendingTrainingToast, showToast, userProfile]);

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
        <main className="flex-1 relative z-10 overflow-y-auto thin-scrollbar">
          {children}
        </main>
        <ScrollToTopButton isHomePage={location.pathname === "/"} />
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
            username={sidebarUsername}
            faction={sidebarFaction}
            handleLogout={handleLogout}
            isAdmin={sidebarIsAdmin}
          />
        </div>

        <div className="flex flex-col flex-1 w-0 relative">
          <div
            ref={scrollableContainerRef}
            className="flex-1 relative overflow-y-auto overflow-x-hidden thin-scrollbar flex flex-col"
          >
            <div className="md:hidden">
              <TopBar
                userProfile={userProfile as any}
              />
            </div>

            <main className="focus:outline-none pt-0 px-4 md:px-6 pb-6 md:pb-6 relative w-full">
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
          <ScrollToTopButton scrollableRef={scrollableContainerRef} isHomePage={location.pathname === "/"} />
        </div>

        {/* Menu Lateral Direito (Teste do usuário) */}
        <div className="hidden md:flex md:flex-shrink-0 z-20 h-full">
          <RightPlayerSidebar userProfile={userProfile as any} />
        </div>
      </div>

      <Tooltip id="server-time-tooltip" place="top-end" style={{ zIndex: 99999 }} className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans" />
      <Tooltip id="game-clock-tooltip" place="top-end" style={{ zIndex: 99999 }} className="!bg-slate-700 !bg-opacity-80 !backdrop-blur-sm !text-white !rounded-lg !px-3 !py-1 !text-[8px] !font-sans" />
      <MobileAppDrawer />
    </div>
  );
};

export default GlobalLayout;