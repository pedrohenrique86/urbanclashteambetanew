import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import DashboardSidebar from "./DashboardSidebar";
import { FloatingMenuButton } from "./FloatingMenuButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfileContext } from "../../contexts/UserProfileContext";
import { useHUD } from "../../contexts/HUDContext";
import dashbgangster from "../../assets/dashbgangster.webp";
import { Tooltip } from "react-tooltip";
import { useGameClock } from "../../hooks/useGameClock";
import GameClockDisplay from "./GameClockDisplay";
import ScrollToTopButton from "./ScrollToTopButton";
import DigitalIdentityModal from "../DigitalIdentityModal";
import ClanIdentityModal from "../ClanIdentityModal";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { themeClasses } = useTheme();
  const { userProfile, handleLogout } = useUserProfileContext();
  const { currentPanel, closePanel, clearPanels, hasOpenPanel } = useHUD();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const { remainingTime, status, serverTime } = useGameClock();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && hasOpenPanel) {
        closePanel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePanel, hasOpenPanel]);

  // Bloqueio de scroll no body durante o jogo para evitar double scrollbars
  // e garantir que o reset de rotas funcione no container correto.
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    clearPanels();
    // Reseta o scroll para o topo ao mudar de rota (Container interno + Viewport)
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

  const onTouchStartObj = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMoveObj = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndObj = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (
      isLeftSwipe &&
      !isMobileMenuOpen &&
      touchStart > window.innerWidth - 60
    ) {
      setIsMobileMenuOpen(true);
    }

    if (isRightSwipe && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  if (!shouldShowNav) {
    return <>{children}</>;
  }

  const isDashboard = location.pathname === "/dashboard";

  const backgroundStyle = isDashboard
    ? { backgroundImage: `url(${dashbgangster})` }
    : {};

  const layoutClasses = isDashboard ? "bg-cover bg-center" : themeClasses.bg;

  return (
    <div
      className={`h-screen font-exo text-white ${layoutClasses} overflow-hidden flex flex-col`}
      style={backgroundStyle}
      onTouchStart={onTouchStartObj}
      onTouchMove={onTouchMoveObj}
      onTouchEnd={onTouchEndObj}
    >
      <div
        className={`flex flex-1 overflow-hidden ${isDashboard ? "bg-black/20" : ""
          }`}
      >
        <div className="hidden md:flex md:flex-shrink-0 z-20 h-full">
          <DashboardSidebar
            username={userProfile?.username}
            faction={
              userProfile?.faction?.name as
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
              handleLogout={handleLogout}
              onMenuToggle={() => setIsMobileMenuOpen(true)}
            />

            <main className="focus:outline-none pt-[115px] md:pt-[70px] px-4 md:px-6 pb-[60px] md:pb-6 relative z-10 w-full">
              {children}
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

      <GameClockDisplay
        remainingTime={remainingTime}
        status={status}
        serverTime={serverTime}
        isCollapsed={false}
        isMobileMode={true}
      />

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

      <FloatingMenuButton />
      <ScrollToTopButton scrollableRef={scrollableContainerRef} />
    </div>
  );
};

export default GlobalLayout;