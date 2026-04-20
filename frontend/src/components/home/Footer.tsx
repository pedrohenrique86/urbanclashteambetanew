import React from 'react';
import { motion } from 'framer-motion';
import { FaDiscord, FaYoutube, FaInstagram, FaWikipediaW } from 'react-icons/fa';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-black py-12 px-6 border-t border-white/5 overflow-hidden">
      {/* Background Technical Pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Brand & Season */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center font-orbitron font-bold text-xl tracking-tighter">
              <span className="text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text font-bold">
                URBAN
              </span>
              <span className="mx-1 text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-bold">
                CLASH
              </span>
              <span className="text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-bold">
                TEAM
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black font-orbitron text-orange-600 tracking-[0.3em] uppercase bg-orange-600/10 px-2 py-0.5 rounded">
                TEMPORADA 1
              </span>
              <span className="text-[10px] text-gray-700 font-orbitron tracking-widest uppercase">
                V2.4.0-BETA
              </span>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex gap-4">
            {[
              { Icon: FaDiscord, href: "#" },
              { Icon: FaYoutube, href: "#" },
              { Icon: FaInstagram, href: "#" },
              { Icon: FaWikipediaW, href: "#" }
            ].map(({ Icon, href }, i) => (
              <motion.a
                key={i}
                href={href}
                whileHover={{ y: -3, color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.3)' }}
                className="w-11 h-11 border border-white/5 rounded-full flex items-center justify-center text-gray-500 transition-all duration-300 bg-white/5 hover:bg-orange-500/5 shadow-lg"
              >
                <Icon size={20} />
              </motion.a>
            ))}
          </div>

          {/* Copyright Section */}
          <div className="flex flex-col items-center md:items-end gap-1 font-orbitron">
            <span className="text-[9px] text-gray-600 tracking-[0.2em]">© {currentYear} TODOS OS DIREITOS RESERVADOS</span>
            <div className="flex items-center gap-2 text-[8px] text-gray-700 tracking-widest">
              <span className="w-1 h-1 rounded-full bg-green-500/50" />
              SISTEMA OPERACIONAL
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}