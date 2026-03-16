import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNavBar from "./BottomNavBar"; // Importando o novo componente
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfile } from "../../hooks/useUserProfile";

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeClasses } = useTheme();

  // Páginas que não devem mostrar a barra de navegação
  const pagesWithoutNav = [
    "/",
    "/faction",
    "/faction-selection",
    "/clan-selection",
    "/confirm-email",
    "/reset-password",
  ];
  const shouldShowNav = !pagesWithoutNav.includes(location.pathname);

  // useUserProfile é chamado condicionalmente, mas as regras dos hooks são mantidas
  const { userProfile } = useUserProfile(shouldShowNav);

  const navigateTo = (path: string) => {
    navigate(path);
  };

  if (!shouldShowNav) {
    return <>{children}</>;
  }

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}
    >
      <main className="pb-24">
        {" "}
        {/* Adiciona padding na parte inferior para não sobrepor o conteúdo */}
        {children}
      </main>
      <BottomNavBar navigateTo={navigateTo} userProfile={userProfile} />
    </div>
  );
};

export default GlobalLayout;
