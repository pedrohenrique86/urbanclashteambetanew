import { motion } from "framer-motion";

export default function FactionHeader() {
  return (
    <div className="text-center mb-4 relative group">
      {/* Subtle Dark Glow for Legibility */}
      <div className="absolute inset-x-0 -top-10 bottom-0 bg-black/40 blur-3xl pointer-events-none -z-10" />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        {/* Protocol Label - Enhanced Contrast */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-orange-500" />
          <span className="text-[9px] tracking-[0.5em] text-orange-500 font-black uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
             AWAITING_PROTOCOL_SELECTION
          </span>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-orange-500" />
        </div>
        
        {/* Title - Downscaled for better fit */}
        <div className="relative mb-3">
          <h1 className="text-lg sm:text-3xl font-orbitron font-black tracking-[0.2em] text-white uppercase italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
            DEFINA SEU <span className="text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-400 bg-clip-text">DESTINO</span>
          </h1>
          <div className="absolute -bottom-2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Narrative Context - Strongly Visible */}
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] text-zinc-100 font-bold uppercase tracking-[0.15em] leading-relaxed drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)] px-4">
            DIRECIONE SUA LEALDADE. CADA CAMINHO REESCREVE A ORDEM DO URBAN CLASH.
          </p>
        </div>
      </motion.div>
    </div>
  );
}