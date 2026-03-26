import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNavBar from "./BottomNavBar";
import TopBar from "./TopBar";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { apiClient } from "../../lib/supabaseClient";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { motion } from "framer-motion";

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

  const { userProfile, loading } = useUserProfile(shouldShowNav);

  const [minLoadingTimePassed, setMinLoadingTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTimePassed(true);
    }, 5000); // 5 segundos

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Limpa a flag de transição suave quando o carregamento do perfil terminar
    if (!loading && sessionStorage.getItem("justJoinedClan")) {
      sessionStorage.removeItem("justJoinedClan");
    }
  }, [loading]);

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

  // Se estiver carregando OU se o tempo mínimo de 10 segundos ainda não passou,
  // OU se o usuário não tiver o perfil completo (facção e clã),
  // exibe apenas um fundo com spinner.
  const showGlobalLoadingSpinner =
    loading ||
    !minLoadingTimePassed ||
    !userProfile ||
    !userProfile.faction ||
    !userProfile.clan_id;

  if (showGlobalLoadingSpinner) {
    // Se for a transição imediata após escolher o clã, não mostra o spinner, apenas o fundo
    if (sessionStorage.getItem("justJoinedClan")) {
      return <div className={`min-h-screen ${themeClasses.bg}`} />;
    }

    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex flex-col items-center justify-center`}
      >
        <LoadingSpinner />
        <motion.p
          className="text-white text-lg mt-4 font-orbitron flex" // Adicionado 'flex' para alinhar as letras
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1, // Atraso entre a animação de cada letra
              },
            },
          }}
        >
          {"Aguarde".split("").map((char, index) => (
            <motion.span
              key={index}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
              }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.p>
      </div>
    );
  }

  if (!shouldShowNav) {
    return <>{children}</>;
  }

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}
    >
      <TopBar userProfile={userProfile} handleLogout={handleLogout} />
      <main className="pt-28 md:pt-16 pb-24">{children}</main>
      <BottomNavBar navigateTo={navigateTo} userProfile={userProfile} />
    </div>
  );
};

export default GlobalLayout;
