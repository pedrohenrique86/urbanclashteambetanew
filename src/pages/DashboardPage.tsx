import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserProfile } from "../hooks/useUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { StatsCards, NavigationButtons } from "../components/dashboard";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { themeClasses, isDarkTheme } = useTheme();
  const { userProfile, loading: profileLoading } = useUserProfile();

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6 md:p-8"
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
  );
}
