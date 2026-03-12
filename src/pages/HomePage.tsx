import React, { useState } from "react";
import { motion } from "framer-motion";
import AuthModal from "../components/AuthModal";
import Timeline from "../components/Timeline";
import RankingSection from "../components/RankingSection";
import { HeroSection, FactionsSection, AboutSection, PrizesSection, Footer } from "../components/home";

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const openAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-exo relative">
      <Timeline />
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-orbitron flex items-center">
                <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                  URBAN
                </span>
                <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                  CLASH
                </span>
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold">
                  TEAM
                </span>
                <motion.div
                  className="ml-2 w-2 h-2 rounded-full bg-orange-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    backgroundColor: [
                      "rgb(249, 115, 22)", // orange-500
                      "rgb(37, 99, 235)", // blue-600
                      "rgb(168, 85, 247)", // purple-500
                      "rgb(249, 115, 22)", // orange-500
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </h1>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => openAuthModal("login")}
                className="bg-orange-600 hover:bg-orange-700 px-3 sm:px-4 md:px-6 py-2 rounded-lg font-bold transition-all hover:scale-105 text-sm sm:text-base font-orbitron"
              >
                Entrar
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 md:px-6 py-2 rounded-lg font-bold transition-all hover:scale-105 text-sm sm:text-base font-orbitron"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <HeroSection openAuthModal={openAuthModal} />

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
    </div>
  );
}
