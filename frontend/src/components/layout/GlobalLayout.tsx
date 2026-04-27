import React, { useRef, useEffect, useMemo } from "react";
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
  const { userProfile, handleLogout, refreshProfile, setUserProfile } = useUserProfileContext();
  const { currentPanel, closePanel, clearPanels, hasOpenPanel } = useHUD();
  const { showToast } = useToast();
  const completingRef = useRef(false);

  // Estabiliza props do sidebar — evita re-render quando XP/dinheiro mudam
  const sidebarUsername = useMemo(() => userProfile?.username, [userProfile?.username]);
  const sidebarFaction = useMemo(
    () => (userProfile?.faction?.name || userProfile?.faction) as "gangsters" | "guardas" | undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userProfile?.faction]
  );
  const sidebarIsAdmin = useMemo(() => userProfile?.is_admin, [userProfile?.is_admin]);

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

  // SÊNIOR: A conclusão do treinamento agora é 100% gerenciada pelo Backend (Worker). 
  // Nenhuma checagem (tick) de tempo precisa ser feita pelo front-end. O servidor
  // processará no milissegundo exato e despachará via SSE o novo status ou enviará no login.


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
        `Treinamento concluído! [ +${g.attack} ATK, +${g.defense} DEF, +${g.focus} FOC, +${g.xp} XP ]`,
        "success",
        7000
      );
      // Limpa o toast no estado React para não disparar novamente em re-renders
      setUserProfile((prev) =>
        prev ? { ...prev, pending_training_toast: null } : prev
      );
    }
  }, [userProfile?.pending_training_toast, showToast, setUserProfile]);

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
            username={sidebarUsername}
            faction={sidebarFaction}
            handleLogout={handleLogout}
            isAdmin={sidebarIsAdmin}
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