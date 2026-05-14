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
      
      setIsVisible(currentScroll > 200);
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
          className="fixed bottom-[14px] md:bottom-12 right-2 md:right-8 xl:right-[300px] z-[99999] flex flex-col items-center gap-0 md:gap-1 group cursor-pointer"
        >
          {/* Tactical Container */}
          <div className="relative w-7 h-7 md:w-8 md:h-8 flex items-center justify-center scale-90 md:scale-100">
            {/* Cyberpunk Shape & Glow */}
            <div className="absolute inset-0 bg-zinc-950/60 md:bg-zinc-950/90 backdrop-blur-xl border border-white/20 md:border-orange-500/40 rounded-lg transform rotate-45 group-hover:border-orange-500 transition-all duration-300" />
            
            {/* Icon */}
            <ChevronUp className="relative z-10 w-3 h-3 md:w-4 md:h-4 text-white/70 md:text-orange-500 group-hover:text-orange-400 group-hover:-translate-y-0.5 transition-all duration-300" strokeWidth={3} />
          </div>

          {/* Label - Ultra Compact for Desktop */}
          <span className="hidden md:block text-[6px] font-orbitron font-black tracking-[0.15em] text-orange-500/40 group-hover:text-orange-500 transition-colors uppercase">
            TOPO
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}