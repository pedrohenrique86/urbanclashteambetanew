import React from "react";
import { motion } from "framer-motion";
import homePngUrl from "../../assets/home.webp";
import homeMobilePngUrl from "../../assets/home-mobile.webp";

export function HeroSection() {
  return (
    <section id="hero" className="relative w-full h-screen overflow-hidden bg-gray-900 flex items-center justify-center pt-20">
      {/* Imagem de fundo local - AAA Treatment */}
      <div className="absolute inset-0 z-0">
        <img
          src={homePngUrl}
          className="w-full h-full object-cover object-center saturate-[1.15] contrast-[1.05]"
          alt="Home Background"
        />
        <div className="absolute inset-0 bg-black/30 bg-vignette" />
      </div>

      {/* AAA Cyber Noise Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-noise" />

      {/* Hero Content Wrapper removido a pedido do usuário */}


    </section>
  );
}