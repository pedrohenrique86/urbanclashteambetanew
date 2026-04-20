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
          {/* Desktop Navbar - Slim Single Line */}
          <div className="hidden sm:flex items-center justify-between h-[44px] gap-4">
            {/* Logo Section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <h1 className="text-xl font-orbitron font-black tracking-tighter flex items-center">
                <span className="text-transparent bg-gradient-to-b from-white via-orange-400 to-orange-600 bg-clip-text">URBAN</span>
                <span className="mx-1 text-transparent bg-gradient-to-b from-white via-blue-400 to-blue-600 bg-clip-text">CLASH</span>
                <span className="text-transparent bg-gradient-to-b from-white via-purple-400 to-purple-600 bg-clip-text">TEAM</span>
              </h1>
              <div className="h-3 w-[1px] bg-white/10 mx-1" />
              <span className="text-[9px] font-black font-orbitron text-orange-500 tracking-[0.2em] border border-orange-500/20 px-1.5 py-0.5 bg-orange-500/5 whitespace-nowrap uppercase">
                TEMPORADA 1
              </span>
            </div>

            {/* Countdown */}
            <div className="flex-grow flex justify-center">
              {status === "scheduled" && remainingTime > 0 && (
                <NavbarCountdown remainingTime={remainingTime} />
              )}
            </div>

            {/* Auth Matrix */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleGoogleLogin} className="p-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-all">
                <FcGoogle className="text-base" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-4 py-1 bg-orange-600/10 border border-orange-500/30 rounded text-[10px] font-orbitron text-orange-500 uppercase hover:bg-orange-500 hover:text-black transition-all"
                >
                  LOGIN
                </button>
                <button
                  onClick={() => openAuthModal("register")}
                  className="px-4 py-1 bg-blue-600/10 border border-blue-500/30 rounded text-[10px] font-orbitron text-blue-400 uppercase hover:bg-blue-500 hover:text-black transition-all"
                >
                  ALISTAR
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navbar - 3 Tier Tactical Stack (Simples) */}
          <div className="flex sm:hidden flex-col gap-3 py-3.5">
            {/* Identity - Linha Simples */}
            <div className="flex items-center justify-between px-2">
              <h1 className="text-lg font-orbitron font-black tracking-tighter">
                <span className="text-transparent bg-gradient-to-b from-white via-orange-400 to-orange-600 bg-clip-text">URBAN</span>
                <span className="mx-1 text-transparent bg-gradient-to-b from-white via-blue-400 to-blue-600 bg-clip-text">CLASH</span>
                <span className="text-transparent bg-gradient-to-b from-white via-purple-400 to-purple-600 bg-clip-text">TEAM</span>
              </h1>
              <span className="text-[11px] font-black font-orbitron text-orange-500 tracking-[0.1em] border border-orange-500/20 px-2 py-0.5 bg-orange-500/5 uppercase">
                TEMPORADA 1
              </span>
            </div>

            {/* Mission Clock - Linha Simples */}
            <div className="flex justify-center scale-110 origin-center py-1">
              {status === "scheduled" && remainingTime > 0 && (
                <NavbarCountdown remainingTime={remainingTime} />
              )}
            </div>

            {/* Tactical Ops - Linha Simples Compacta */}
            <div className="flex items-center justify-center gap-2.5 px-2">
              <button 
                onClick={handleGoogleLogin} 
                className="p-2.5 bg-white/5 border border-white/10 rounded-md active:bg-white/10"
              >
                <FcGoogle className="text-base" />
              </button>
              <button
                onClick={() => openAuthModal("login")}
                className="flex-1 max-w-[130px] h-10 flex items-center justify-center bg-orange-600/10 border border-orange-500/30 rounded-md text-[11px] font-orbitron text-orange-500 uppercase active:bg-orange-500 active:text-black transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)]"
              >
                LOGIN
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="flex-1 max-w-[130px] h-10 flex items-center justify-center bg-blue-600/10 border border-blue-500/30 rounded-md text-[11px] font-orbitron text-blue-400 uppercase active:bg-blue-500 active:text-black transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              >
                ALISTAR
              </button>
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


    </div>
  );
}