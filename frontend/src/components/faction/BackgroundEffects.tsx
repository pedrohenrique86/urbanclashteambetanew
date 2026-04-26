import { motion } from "framer-motion";
import bgImage from "../../assets/faction-selection.webp";

interface BackgroundEffectsProps {
  selectedFaction: "gangsters" | "guardas" | null;
}

export default function BackgroundEffects({ selectedFaction }: BackgroundEffectsProps) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* 1. Base Image - 100% Correct visibility */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          className="w-full h-full object-cover saturate-[1.1] contrast-[1.1]"
          alt="Faction Selection Background"
        />
        
        {/* 2. Technical Layer 1: Cinematic Vignette (AAA Styling) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_70%,rgba(0,0,0,0.6)_100%)]" />
        
        {/* 3. Technical Layer 2: Subtle HUD/Scanline Overlay */}
        <div className="absolute inset-0 z-10 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

        {/* 4. Technical Layer 3: Surface Noise/Grain (Advanced Treatment) */}
        <div className="absolute inset-0 z-[5] opacity-[0.04] mix-blend-overlay bg-repeat" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>
      
      {/* 5. Faction Specific Atmospheric Glows - Subtly overlaid */}
      <motion.div
        animate={{ 
          opacity: selectedFaction === "gangsters" ? 0.2 : 0,
        }}
        className="absolute inset-0 bg-orange-950/20 transition-all duration-1000 z-20"
      />

      <motion.div
        animate={{ 
          opacity: selectedFaction === "guardas" ? 0.15 : 0,
        }}
        className="absolute inset-0 bg-blue-950/20 transition-all duration-1000 z-20"
      />

      {/* 6. Floating Dust Particles (Animated) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 bg-white/20 rounded-full blur-[1px] z-30"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}