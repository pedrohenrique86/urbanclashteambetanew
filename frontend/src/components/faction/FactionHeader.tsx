import { motion } from "framer-motion";

export default function FactionHeader() {
  return (
    <div className="text-center mb-16 relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="inline-flex flex-col items-center"
      >
        {/* Recruitment Protocol Label */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] w-8 bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] tracking-[0.6em] text-orange-500 font-black uppercase mb-1">
              ESTABLISHING_LINK
            </span>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-orange-600 animate-pulse" />
              <div className="w-1 h-1 bg-orange-600 animate-pulse delay-75" />
              <div className="w-1 h-1 bg-orange-600 animate-pulse delay-150" />
            </div>
          </div>
          <div className="h-[1px] w-8 bg-zinc-800" />
        </div>
        
        {/* Main Title Container */}
        <div className="relative mb-4">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-orbitron font-black tracking-[0.2em] text-white">
            SELECIONE SEU <span className="relative inline-block text-transparent bg-gradient-to-b from-white to-gray-500 bg-clip-text">DESTINO</span>
          </h1>
          
          {/* Glitchy Underline */}
          <div className="absolute -bottom-2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <motion.div 
            animate={{ x: [-10, 10, -10], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-2 left-0 w-full h-[1px] bg-orange-500/50 blur-[1px]"
          />
        </div>

        {/* Narrative Context */}
        <div className="max-w-xl mx-auto space-y-4">
          <p className="text-[11px] sm:text-xs text-zinc-500 font-mono uppercase tracking-[0.3em] font-medium leading-relaxed">
            [ O SUBMUNDO NÃO PERDOA FRAQUEZA. AS RUAS ESTÃO EM DISPUTA E O SEU ALINHAMENTO DEFINIRÁ SEU FUTURO NO URBAN CLASH TEAM. ]
          </p>
          
          <div className="flex items-center justify-center gap-6 py-4 px-8 border-y border-white/5 bg-white/[0.02]">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1 font-black">LOCALIZAÇÃO</span>
              <span className="text-[10px] text-zinc-300 font-orbitron tracking-wider">CIDADE_ALTA_S01</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1 font-black">ESTADO</span>
              <span className="text-[10px] text-green-500 font-orbitron tracking-wider animate-pulse">SISTEMA_ATIVO</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1 font-black">PROTOCOLO</span>
              <span className="text-[10px] text-orange-500 font-orbitron tracking-wider">A-12_RECRUIT</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}