import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSWRConfig } from "swr";
import { motion } from "framer-motion";
import { useUserProfile } from "../hooks/useUserProfile";
// TODO: Create useDashboardData hook
interface DashboardData {
  isDarkTheme: boolean;
  openMenus: Record<string, boolean>;
  themeClasses: Record<string, string>;
  toggleMenu: (menuId: string) => void;
}

const useDashboardData = (userProfile: any): DashboardData => ({
  isDarkTheme: false,
  openMenus: {},
  themeClasses: {},
  toggleMenu: () => {},
});
import { useTheme } from "../contexts/ThemeContext";
import { useXPCalculations } from "../hooks/useXPCalculations";
import { calculateCombatStats } from "../utils/combat";
import { StatsCards, NavigationButtons } from "../components/dashboard";
import { DashboardHeader, TopBar } from "../components/layout";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  const { theme, themeClasses, isDarkTheme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const dashboardData = useDashboardData(userProfile);

  // Verificar se o usuário tem facção e clã
  useEffect(() => {
    console.log("🔍 DashboardPage - Verificando perfil:", {
      profileLoading,
      userProfile: userProfile
        ? {
            faction: userProfile.faction,
            clan_id: userProfile.clan_id,
            username: userProfile.username,
          }
        : null,
    });

    if (!profileLoading && userProfile) {
      // Verificar se tem facção
      if (!userProfile.faction) {
        console.log("❌ Usuário sem facção, redirecionando...");
        navigate("/faction-selection");
        return;
      }

      // Verificar se tem clã
      if (!userProfile.clan_id) {
        console.log(
          "❌ Usuário sem clã, redirecionando para seleção de clã...",
        );
        navigate("/clan-selection", {
          state: { faction: userProfile.faction },
        });
        return;
      }

      console.log("✅ Usuário tem facção e clã, permanecendo no dashboard");
    }
  }, [userProfile, profileLoading, navigate]);

  // Extract properties from dashboardData
  const {
    isDarkTheme: dashboardIsDarkTheme,
    openMenus,
    themeClasses: dashboardThemeClasses,
    toggleMenu,
  } = dashboardData;

  // Função para navegar para outras páginas do jogo
  const navigateTo = (path: string): void => {
    navigate(path);
  };

  // Loading state
  if (profileLoading) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo">
      {/* Top Bar with Player Stats */}
      <TopBar userProfile={userProfile} />

      {/* Dashboard Header */}
      <DashboardHeader
        username={userProfile?.username || "Usuário"}
        themeClasses={themeClasses}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="p-8"
      >
        {/* Stats Cards */}
        <StatsCards
          userProfile={userProfile}
          themeClasses={themeClasses}
          isDarkTheme={isDarkTheme}
        />

        {/* Navigation Buttons */}
        <NavigationButtons navigateTo={navigateTo} />
      </motion.div>
    </div>
  );
}
