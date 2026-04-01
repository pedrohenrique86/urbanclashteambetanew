import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import DashboardSidebar from "./DashboardSidebar";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { apiClient } from "../../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import dashbgangster from "../../assets/dashbgangster.webp";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pagesWithoutNav = [
    "/",
    "/faction",
    "/faction-selection",
    "/clan-selection",
    "/confirm-email",
    "/reset-password",
  ];
  const shouldShowNav = !pagesWithoutNav.includes(location.pathname);

  const { userProfile, loading } = useUserProfile(shouldShowNav);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (!shouldShowNav) {
    return <>{children}</>;
  }

  if (loading || !userProfile || !userProfile.faction || !userProfile.clan_id) {
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
  }

  const isDashboard = location.pathname === "/dashboard";

  const backgroundStyle = isDashboard
    ? { backgroundImage: `url(${dashbgangster})` }
    : {};

  const layoutClasses = isDashboard
    ? "bg-cover bg-center"
    : themeClasses.bg;

  return (
    <div
      className={`h-screen font-exo text-white overflow-hidden ${layoutClasses}`}
      style={backgroundStyle}
    >
      <div className={`flex h-full ${isDashboard ? "bg-black/20" : ""}`}>
        {/* Sidebar para desktop, fixa na lateral */}
        <div className="hidden md:flex md:flex-shrink-0 z-20 h-full">
          <DashboardSidebar
            username={userProfile.username}
            faction={userProfile.faction}
            handleLogout={handleLogout}
          />
        </div>

        {/* Sidebar para mobile (Drawer) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 left-0 z-50 flex md:hidden"
              >
                <DashboardSidebar
                  onMobileClose={() => setIsMobileMenuOpen(false)}
                  username={userProfile.username}
                  faction={userProfile.faction}
                  handleLogout={handleLogout}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Conteúdo principal */}
        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          {/* Container para o conteúdo que rola, com padding */}
          <div className="flex-1 relative overflow-y-auto p-4 md:p-6">
            <TopBar
              userProfile={userProfile}
              handleLogout={handleLogout}
              onMenuToggle={() => setIsMobileMenuOpen(true)}
            />
            <main className="focus:outline-none pt-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLayout;