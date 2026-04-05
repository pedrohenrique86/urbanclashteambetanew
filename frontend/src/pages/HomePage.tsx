import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuthModal from "../components/AuthModal";
import RankingSection from "../components/RankingSection";
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

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { status, remainingTime } = useGameClock(); // Usar o hook para obter o estado do jogo

  const openAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo relative overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/75 backdrop-blur-sm z-50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between min-h-16 gap-4 py-2">
            {/* Logo - Sempre visível, não encolhe */}
            <div className="flex-shrink-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-orbitron flex items-center">
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

            {/* Botões de Autenticação - Sempre visíveis, não encolhem */}
            <div className="flex-shrink-0 flex gap-1 sm:gap-2">
              <button
                onClick={() => openAuthModal("login")}
                className="bg-orange-600 hover:bg-orange-700 px-2 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-lg font-bold transition-all hover:scale-105 text-xs sm:text-sm font-orbitron"
              >
                Entrar
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="bg-blue-600 hover:bg-blue-700 px-2 sm:px-4 py-1 sm:py-2 rounded-md sm:rounded-lg font-bold transition-all hover:scale-105 text-xs sm:text-sm font-orbitron"
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

      <Footer
        onLoginClick={() => openAuthModal("login")}
        onRegisterClick={() => openAuthModal("register")}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}

      <ScrollToTopButton />
    </div>
  );
}