import React, { useState, useEffect } from "react";
import { FaSpinner } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import AuthModal from "../components/AuthModal";
import { startGoogleLoginFlow } from "../services/authService";
import RankingSection from "../components/RankingSection";
import Timeline from "../components/Timeline";
import {
  HeroSection,
  FactionsSection,
  AboutSection,
  PrizesSection,
  Footer,
} from "../components/home";
import { useGameClock } from "../hooks/useGameClock";
import NavbarCountdown from "../components/layout/NavbarCountdown";
import ScrollToTopButton from "../components/layout/ScrollToTopButton";

import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isGoogleLoginProcessing, setIsGoogleLoginProcessing] = useState(false);
  const { status, remainingTime } = useGameClock();
  const { user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const openAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoginProcessing(true);
    try {
      await startGoogleLoginFlow('login');
    } catch (error) {
      console.error("Falha ao iniciar login com Google:", error);
      setIsGoogleLoginProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo relative overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] transition-all duration-500">
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-2xl border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-50" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-h-[44px] py-0 gap-3">
            
            {/* Logo Section - Ultra Compact */}
            <div className="flex-shrink-0 flex items-center group">
              <h1 className="text-sm sm:text-lg md:text-xl font-orbitron font-black tracking-tighter flex items-center flex-shrink-0 cursor-pointer">
                <span className="text-transparent bg-gradient-to-b from-white via-orange-400 to-orange-600 bg-clip-text drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
                  URBAN
                </span>
                <span className="mx-1 text-transparent bg-gradient-to-b from-white via-blue-400 to-blue-600 bg-clip-text drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                  CLASH
                </span>
                <span className="text-transparent bg-gradient-to-b from-white via-purple-400 to-purple-600 bg-clip-text drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                  TEAM
                </span>
              </h1>
            </div>

            {/* Tactical HUD Countdown */}
            <div className="flex-grow flex justify-center min-w-0 scale-90 sm:scale-100">
              {status === "scheduled" && remainingTime > 0 && (
                <NavbarCountdown remainingTime={remainingTime} />
              )}
            </div>

            {/* Authentication Matrix - Slimmed and Compact */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoginProcessing}
                className="relative p-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-white/30 transition-all group disabled:opacity-30"
              >
                {isGoogleLoginProcessing ? (
                  <FaSpinner className="animate-spin text-xs sm:text-sm text-orange-500" />
                ) : (
                  <FcGoogle className="text-xs sm:text-sm group-hover:rotate-12 transition-transform" />
                )}
                <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-green-500 rounded-full blur-[1px] animate-pulse" />
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => openAuthModal("login")}
                  className="relative group px-2 sm:px-4 py-1 overflow-hidden bg-orange-600/10 border border-orange-500/40 hover:bg-orange-600 transition-all duration-300"
                >
                  <span className="relative z-10 font-orbitron font-black text-[8px] sm:text-[10px] text-orange-400 group-hover:text-white tracking-[0.15em] uppercase">
                    Login
                  </span>
                </button>

                <button
                  onClick={() => openAuthModal("register")}
                  className="relative group px-2 sm:px-4 py-1 overflow-hidden bg-blue-600/10 border border-blue-500/40 hover:bg-blue-600 transition-all duration-300"
                >
                  <span className="relative z-10 font-orbitron font-black text-[8px] sm:text-[10px] text-blue-400 group-hover:text-white tracking-[0.15em] uppercase">
                    Alistar
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />
      <FactionsSection />
      <AboutSection />
      <RankingSection />
      <PrizesSection />
      <Footer />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}

      <Timeline 
        isVisible={true} 
        onGoToStart={() => window.scrollTo({ top: 0, behavior: "smooth" })} 
      />

      <ScrollToTopButton />
    </div>
  );
}