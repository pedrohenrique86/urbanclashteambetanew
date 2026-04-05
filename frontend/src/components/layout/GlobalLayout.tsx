import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import DashboardSidebar from "./DashboardSidebar";
import { FloatingMenuButton } from "./FloatingMenuButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { apiClient } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import dashbgangster from "../../assets/dashbgangster.webp";
import { Tooltip } from "react-tooltip";
import { useGameClock } from "../../hooks/useGameClock";
import GameClockDisplay from "./GameClockDisplay";
import ScrollToTopButton from "./ScrollToTopButton";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const { remainingTime, status, serverTime } = useGameClock();

  // Páginas que NÃO têm a navegação (sidebar/topbar)
  // O GlobalLayout não é renderizado para essas páginas pois elas usam rota direta
  const pagesWithoutNav = [
    "/",
    "/faction",
    "/faction-selection",
    "/clan-selection",
    "/confirm-email",
    "/reset-password",
    "/auth/google/callback",
  ];
  const shouldShowNav = !pagesWithoutNav.some(p => location.pathname === p || location.pathname.startsWith("/auth/"));

  const { userProfile, loading } = useUserProfile();

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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

    if (isLeftSwipe && !isMobileMenuOpen && touchStart > window.innerWidth - 60) {
      setIsMobileMenuOpen(true);
    }

    if (isRightSwipe && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Páginas sem nav renderizam os filhos diretamente
  if (!shouldShowNav) {
    return <>{children}</>;
  }

  // Enquanto carrega, mostra fundo escuro
  if (loading) {
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
  }

  // Guarda de rota: usuário não autenticado → Home
  if (!userProfile) {
    navigate("/", { replace: true });
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
  }

  // Guarda de rota: usuário sem facção → seleção de facção
  if (!userProfile.faction) {
    navigate("/faction-selection", { replace: true });
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
  }

  // Guarda de rota: usuário sem clã → seleção de clã
  if (!userProfile.clan_id) {
    navigate("/clan-selection", { replace: true });
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
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
      <div className={`flex flex-1 overflow-hidden ${isDashboard ? "bg-black/20" : ""}`}>
        {/* Sidebar para desktop, fixa na lateral */}
        <div className="hidden md:flex md:flex-shrink-0 z-20 h-full">
          <DashboardSidebar
            username={userProfile.username}
            faction={userProfile.faction}
            handleLogout={handleLogout}
            isAdmin={userProfile.is_admin}
          />
        </div>

        {/* Conteúdo principal */}
        <div className="flex flex-col flex-1 w-0">
          {/* Container para o conteúdo que rola, sem padding */}
          <div
            ref={scrollableContainerRef}
            className="flex-1 relative overflow-y-auto overflow-x-hidden"
          >
            <TopBar
              userProfile={userProfile}
              handleLogout={handleLogout}
              onMenuToggle={() => setIsMobileMenuOpen(true)}
            />
            <main className="focus:outline-none pt-[115px] md:pt-[70px] px-4 md:px-6 pb-[60px] md:pb-6 relative z-10 w-full">
              {children}
            </main>
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