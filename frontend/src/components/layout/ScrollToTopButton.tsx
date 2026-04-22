import React, { useState, useEffect, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useHUD } from "../../contexts/HUDContext";

interface ScrollToTopButtonProps {
  scrollableRef?: RefObject<HTMLDivElement>;
}

export default function ScrollToTopButton({ scrollableRef }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { isMobileDrawerOpen } = useHUD();

  useEffect(() => {
    const handleScroll = () => {
      // Captura scroll tanto de containers internos (Dashboard) quanto do window (Home)
      const currentScroll = scrollableRef?.current 
        ? scrollableRef.current.scrollTop 
        : window.scrollY || document.documentElement.scrollTop;
      
      setIsVisible(currentScroll > 350);
    };

    // Ouvinte em fase de captura para abranger qualquer scrollbar na viewport
    window.addEventListener("scroll", handleScroll, true);
    const interval = setInterval(handleScroll, 600); // Check redundante

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      clearInterval(interval);
    };
  }, [scrollableRef]);

  const scrollToTop = () => {
    const target = scrollableRef?.current || window;
    target.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && !isMobileDrawerOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="fixed bottom-[6px] md:bottom-12 right-2 md:right-4 z-[9995] flex flex-col items-center gap-0 md:gap-1 group cursor-pointer"
        >
          {/* Tactical Container */}
          <div className="relative w-10 h-10 md:w-10 md:h-10 flex items-center justify-center scale-75 md:scale-100">
            {/* Cyberpunk Shape & Glow - More discreet on mobile */}
            <div className="absolute inset-0 bg-zinc-950/40 md:bg-zinc-950/90 backdrop-blur-xl border border-white/10 md:border-orange-500/40 rounded-lg transform rotate-45 group-hover:border-orange-500 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-300" />
            
            {/* Icon */}
            <ChevronUp className="relative z-10 w-5 h-5 text-white/50 md:text-orange-500 group-hover:text-orange-400 group-hover:-translate-y-0.5 transition-all duration-300" strokeWidth={3} />
          </div>

          {/* Label - Hidden on mobile */}
          <span className="hidden md:block text-[8px] font-orbitron font-black tracking-[0.25em] text-orange-500/80 group-hover:text-orange-500 transition-colors uppercase">
            TOPO
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}