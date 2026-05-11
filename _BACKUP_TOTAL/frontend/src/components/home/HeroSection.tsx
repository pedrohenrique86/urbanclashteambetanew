import React from "react";
import homePngUrl from "../../assets/home.webp";
import homeMobilePngUrl from "../../assets/home-mobile.webp";

export function HeroSection() {
  return (
    <section id="hero" className="relative w-full h-[100dvh] overflow-hidden bg-black flex items-center justify-center">
      {/* Background Layer with Responsive Image */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source srcSet={homeMobilePngUrl} media="(max-width: 767px)" />
          <img
            src={homePngUrl}
            className="w-full h-full object-cover object-[50%_50%] saturate-[1.1] contrast-[1.1]"
            alt="Submundo Urbano Background"
          />
        </picture>

        {/* Technical Layer 1: Cinematic Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
        
        {/* Technical Layer 2: HUD/Scanline Overlay (AAA Quality) */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_3px,3px_100%] animate-pulse" />
        
        {/* Technical Layer 3: Bottom Gradient Transition to Home Content */}
        <div className="absolute inset-x-0 bottom-0 h-40 md:h-64 bg-gradient-to-t from-black via-black/60 to-transparent z-20" />
      </div>

      {/* Surface Noise/Grain Overlay - Embedded to prevent 403 Error */}
      <div className="absolute inset-0 z-[5] pointer-events-none opacity-[0.05] mix-blend-overlay bg-repeat" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </section>
  );
}