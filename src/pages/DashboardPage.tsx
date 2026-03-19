import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserProfile } from "../hooks/useUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { StatsCards, NavigationButtons } from "../components/dashboard";
import { DashboardHeader, TopBar } from "../components/layout";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { themeClasses, isDarkTheme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // Verificar se o usuário tem facção e clã
  useEffect(() => {
    if (!profileLoading && userProfile) {
      // Verificar se tem facção
      if (!userProfile.faction) {
        navigate("/faction-selection");
        return;
      }

      // Verificar se tem clã
      if (!userProfile.clan_id) {
        navigate("/clan-selection", {
          state: { faction: userProfile.faction },
        });
        return;
      }
    }
  }, [userProfile, profileLoading, navigate]);

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
      <DashboardHeader username={userProfile?.username || "Usuário"} />

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
        <NavigationButtons />
      </motion.div>
    </div>
  );
}
