import React, { useState, useRef, useEffect } from "react";
import { UserProfile } from "../../types";
import GameClockDisplay from "./GameClockDisplay";
import { useGameClock } from "../../hooks/useGameClock";

interface BottomNavBarProps {
  userProfile: UserProfile | null;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ userProfile }) => {
  const { remainingTime, status, serverTime } = useGameClock();
  const isAdmin = userProfile?.is_admin === true;

  // Lógica para o menu de admin pode ser mantida ou movida, se necessário.
  // Por enquanto, vamos focar em limpar a navegação principal.

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-t-2 border-t-amber-800/50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50 flex justify-center items-center h-16 md:h-20 px-4">
      <GameClockDisplay
        remainingTime={remainingTime}
        status={status}
        serverTime={serverTime}
      />
      {/* O menu de admin foi removido para simplificar, pode ser readicionado em outro lugar se preciso */}
    </div>
  );
};

export default BottomNavBar;
