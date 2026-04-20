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

  // Se a autenticação ainda está sendo validada, não faz nada para evitar flicker.
  if (isHydrating) {
    return null; // ou um spinner de tela cheia, se preferir
  }

  // Se o usuário está autenticado, redireciona para o dashboard.
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
      // Chama a função centralizada para iniciar o fluxo de login
      await startGoogleLoginFlow('login');
    } catch (error) {
      console.error("Falha ao iniciar login com Google:", error);
      // Em caso de erro, reabilita o botão para nova tentativa
      setIsGoogleLoginProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo relative overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/10 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-between min-h-16 gap-3 md:gap-4 py-3 md:py-2">
            {/* Logo - Sempre visível, não encolhe */}
            <div className="flex-shrink-0 w-full md:w-auto flex justify-center md:justify-start">
              <h1 className="text-xl sm:text-2xl md:text-2xl font-orbitron flex items-center">
                <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                  URBAN
                </span>
                <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                  CLASH
                </span>
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold">
                  TEAM
                </span>
              </h1>
            </div>

            {/* Cronômetro - Cresce para ocupar espaço, mas pode encolher. Centralizado. */}
            <div className="w-full md:w-auto flex-grow md:flex-grow-0 order-last md:order-none flex justify-center min-w-0">
              {status === "scheduled" && remainingTime > 0 && (
                <NavbarCountdown remainingTime={remainingTime} />
              )}
            </div>

            {/* Botões de Autenticação */}
            <div className="flex-shrink-0 flex items-center justify-center w-full md:w-auto gap-3 md:gap-2">
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoginProcessing}
                className="bg-white p-2 rounded-md transition-all hover:scale-105 flex items-center justify-center disabled:opacity-50"
                aria-label="Entrar com Google"
              >
                {isGoogleLoginProcessing ? <FaSpinner className="animate-spin text-xl" /> : <FcGoogle className="text-xl" />}
              </button>
              <button
                onClick={() => openAuthModal("login")}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 sm:px-5 sm:py-2 rounded-md font-bold transition-all hover:scale-105 text-sm md:text-base font-orbitron"
              >
                Entrar
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 sm:px-5 sm:py-2 rounded-md font-bold transition-all hover:scale-105 text-sm md:text-base font-orbitron"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />

      <FactionsSection />

      <AboutSection />

      {/* Rankings Section */}
      <RankingSection />

      <PrizesSection />

      <Footer />

      {/* Auth Modal */}
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