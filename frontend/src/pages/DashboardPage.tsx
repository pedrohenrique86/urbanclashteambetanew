import React from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import { useUserProfile } from "../hooks/useUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { StatsCards, NavigationButtons } from "../components/dashboard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { themeClasses, isDarkTheme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // Se o perfil ainda não foi carregado (primeira visita), mostra o spinner de tela cheia.
  if (profileLoading && !userProfile) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}
      >
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PageContainer>
      {/* Stats Cards */}
      <StatsCards
        userProfile={userProfile}
        themeClasses={themeClasses}
        isDarkTheme={isDarkTheme}
      />

      {/* Navigation Buttons */}
      <NavigationButtons />
    </PageContainer>
  );
}
