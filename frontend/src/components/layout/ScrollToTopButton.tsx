import React, { useState, useEffect, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useLocation } from "react-router-dom";

interface ScrollToTopButtonProps {
  scrollableRef?: RefObject<HTMLDivElement>;
}

export default function ScrollToTopButton({ scrollableRef }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const targetElement = scrollableRef?.current || window;
    
    const toggleVisibility = () => {
      const yOffset = scrollableRef?.current 
        ? scrollableRef.current.scrollTop 
        : window.pageYOffset;
      
      setIsVisible(yOffset > 400);
    };

    targetElement.addEventListener("scroll", toggleVisibility);
    return () => targetElement.removeEventListener("scroll", toggleVisibility);
  }, [scrollableRef, location.pathname]);

  const scrollToTop = () => {
    const target = scrollableRef?.current || window;
    target.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Lógica de visibilidade Triple-A:
  // - Mobile (< 1024px): Sempre visível se scroll > 400
  // - Desktop (>= 1024px): Visível somente se NÃO for a HOME
  const isHome = location.pathname === "/";
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 z-[999] group 
            ${isHome ? "flex lg:hidden" : "flex"} 
            flex-col items-center justify-center cursor-pointer`}
          aria-label="Voltar ao topo"
        >
          {/* Tactical Frame */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Background Layer (Hexagonal feel) */}
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-lg transform rotate-45 group-hover:border-orange-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
            
            {/* Inner Glow */}
            <div className="absolute inset-0.5 bg-gradient-to-br from-orange-500/20 to-transparent rounded-lg transform rotate-45 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Icon */}
            <ChevronUp className="relative z-10 w-5 h-5 text-white group-hover:text-orange-500 group-hover:-translate-y-0.5 transition-all duration-300" />
          </div>

          {/* Label - Orbitron Style */}
          <span className="mt-3 text-[8px] font-orbitron font-black tracking-[0.2em] text-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-300 uppercase transform translate-y-1 group-hover:translate-y-0">
            TOPO
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}