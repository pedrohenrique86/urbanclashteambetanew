import React, { useState, useEffect, RefObject } from "react";
import { useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";

interface ScrollToTopButtonProps {
  scrollableRef?: RefObject<HTMLDivElement>;
}

export default function ScrollToTopButton({ scrollableRef }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    setIsVisible(false);

    if (isHome) {
      // Home: IntersectionObserver na seção #factions
      // Aparece SOMENTE após o usuário ter scrollado para além do hero (factions saiu do topo)
      const factionsSection = document.getElementById("factions");
      if (!factionsSection) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          // Mostra quando o topo da seção já passou para cima do viewport (scrollou além)
          // OU quando a seção está visível na tela (chegando nela enquanto scrolla para baixo)
          const pastTop = entry.boundingClientRect.top < 0;
          const intersecting = entry.isIntersecting;
          setIsVisible(intersecting || pastTop);
        },
        { threshold: 0, rootMargin: "0px" }
      );

      observer.observe(factionsSection);
      return () => observer.disconnect();
    }

    // Demais páginas: scroll do container HUD ou window
    const handleScroll = () => {
      const scrollTop = scrollableRef?.current?.scrollTop ?? window.scrollY;
      setIsVisible(scrollTop > 280);
    };

    const target = scrollableRef?.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true } as EventListenerOptions);
    handleScroll();

    return () => target.removeEventListener("scroll", handleScroll);
  }, [isHome, scrollableRef, location.pathname]);

  const scrollToTop = () => {
    if (scrollableRef?.current) {
      scrollableRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    /**
     * Home:   só aparece em mobile (lg:hidden).
     *         Desktop da home nunca exibe — negado via classe Tailwind.
     * Resto:  sempre visível em qualquer viewport.
     */
    <button
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
      className={`fixed bottom-6 right-5 z-[9999] group flex flex-col items-center gap-1
        animate-fade-in
        ${isHome ? "lg:hidden" : ""}`}
      style={{ animation: "scrollBtnIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      {/* Container hexagonal com glow AAA */}
      <div
        className="
          relative w-10 h-10
          flex items-center justify-center
          bg-zinc-950/95 backdrop-blur-2xl
          border border-orange-500/50
          rounded-xl
          shadow-[0_0_18px_rgba(249,115,22,0.28),0_6px_24px_rgba(0,0,0,0.7)]
          group-hover:border-orange-400/80
          group-hover:shadow-[0_0_28px_rgba(249,115,22,0.5),0_6px_24px_rgba(0,0,0,0.8)]
          group-active:scale-90
          transition-all duration-200 ease-out
          overflow-hidden
        "
      >
        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.08)_50%)] bg-[length:100%_3px] opacity-20 pointer-events-none" />
        {/* Corner accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-orange-500/60" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-orange-500/60" />
        {/* Icon */}
        <ChevronUp
          className="
            w-5 h-5 text-orange-500
            group-hover:text-orange-400
            group-hover:-translate-y-0.5
            transition-all duration-200
            relative z-10
          "
          strokeWidth={2.5}
        />
      </div>

      {/* Label */}
      <span className="
        text-[8px] font-orbitron font-black tracking-[0.3em]
        text-orange-500/70
        group-hover:text-orange-400/90
        transition-colors duration-200
        select-none
      ">
        TOPO
      </span>

      <style>{`
        @keyframes scrollBtnIn {
          from { opacity: 0; transform: translateY(12px) scale(0.88); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </button>
  );
}