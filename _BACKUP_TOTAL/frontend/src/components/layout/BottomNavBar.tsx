import React, { useState, useRef, useEffect } from "react";
import { UserProfile } from "../../types";
import GameClockDisplay from "./GameClockDisplay";
import { useGameClock } from "../../hooks/useGameClock";

interface BottomNavBarProps {
  userProfile: UserProfile | null;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ userProfile }) => {
  // O conteúdo foi movido para a DashboardSidebar.
  // Este componente será removido do GlobalLayout na próxima etapa.
  return null;
};

export default BottomNavBar;