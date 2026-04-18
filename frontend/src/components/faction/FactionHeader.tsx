import { motion } from "framer-motion";

export default function FactionHeader() {
  return (
    <div className="text-center mb-10 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="inline-flex flex-col items-center"
      >
        {/* Recruitment Protocol Label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-[2px] w-4 bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
          <span className="text-[9px] sm:text-[10px] tracking-[0.5em] text-orange-500 font-black uppercase">
            PROTOCOL // RECRUITMENT_INIT
          </span>
          <div className="h-[2px] w-4 bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
        </div>
        
        {/* Main Title */}
        <div className="relative group">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-orbitron font-black tracking-[0.3em] text-white">
            ESCOLHA SUA <span className="relative inline-block">
              <span className="text-transparent bg-gradient-to-r from-orange-500 via-white to-blue-500 bg-clip-text">
                FACÇÃO
              </span>
              {/* Decorative scanline effect under title */}
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />
            </span>
          </h1>
        </div>

        {/* Action Description */}
        <div className="mt-6 space-y-2">
          <p className="text-sm sm:text-base text-white font-exo font-bold uppercase tracking-[0.2em] opacity-90">
            [ SUA ESCOLHA DEFINIRÁ SEU PAPEL NA CIDADE ]
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <span className="text-[10px] sm:text-xs font-black text-orange-500 uppercase tracking-[0.3em] bg-orange-500/10 px-3 py-1 rounded border border-orange-500/20">
              DECISÃO PERMANENTE • ESCOLHA COM SABEDORIA
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}