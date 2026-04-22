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

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { userProfile, handleLogout } = useUserProfileContext();
  const { currentPanel, closePanel, clearPanels, hasOpenPanel } = useHUD();

  // SÊNIOR: Lógica de exibição do Blocker (Oculta se estiver na página de destino do status)
  const status = userProfile?.status || 'Operacional';
  const path = location.pathname;
  const hideBlocker = (
    (status === 'Operacional') ||
    (status === 'Isolamento' && path === '/isolation') ||
    (status === 'Recondicionamento' && path === '/recovery-base') ||
    (status === 'Aprimoramento' && path === '/training')
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