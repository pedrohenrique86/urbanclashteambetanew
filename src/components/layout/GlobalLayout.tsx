import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNavBar from "./BottomNavBar";
import TopBar from "./TopBar"; // Importa a nova TopBar
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { apiClient } from "../../lib/supabaseClient"; // Importa o apiClient

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeClasses } = useTheme();

  const pagesWithoutNav = [
    "/",
    "/faction",
    "/faction-selection",
    "/clan-selection",
    "/confirm-email",
    "/reset-password",
  ];
  const shouldShowNav = !pagesWithoutNav.includes(location.pathname);

  const { userProfile } = useUserProfile(shouldShowNav);

  const navigateTo = (path: string) => {
    navigate(path);
  };

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

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}
    >
      <TopBar userProfile={userProfile} handleLogout={handleLogout} />
      <main className="pt-20 pb-24">
        {/* Padding-top para não sobrepor o conteúdo, padding-bottom para a BottomNavBar */}
        {children}
      </main>
      <BottomNavBar navigateTo={navigateTo} userProfile={userProfile} />
    </div>
  );
};

export default GlobalLayout;
