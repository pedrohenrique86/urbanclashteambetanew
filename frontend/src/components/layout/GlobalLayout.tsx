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

  // The loading screen logic has been removed to allow for instant rendering.
  // We still need a guard to prevent rendering with incomplete data, which could cause a crash.
  if (loading || !userProfile || !userProfile.faction || !userProfile.clan_id) {
    // Render a simple blank background while data is loading, avoiding the full animated spinner.
    return <div className={`min-h-screen ${themeClasses.bg}`} />;
  }

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} transition-colors duration-300`}
    >
      <TopBar userProfile={userProfile} handleLogout={handleLogout} />
      <main className="pt-28 md:pt-16 pb-24">{children}</main>
      <BottomNavBar userProfile={userProfile} />
    </div>
  );
};

export default GlobalLayout;
