import React, { useState, useEffect } from "react";
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

  // Se o perfil estiver carregando ou se o usuário não tiver um perfil completo (sem facção/clã),
  // não renderize nada. O hook `useUserProfile` cuidará do redirecionamento necessário.
  // Isso evita qualquer "flash" de conteúdo ou spinner durante a transição ou carregamento inicial.
  if (
    profileLoading ||
    !userProfile ||
    !userProfile.faction ||
    !userProfile.clan_id
  ) {
    return null;
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
