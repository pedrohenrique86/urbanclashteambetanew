import React, { useState, useMemo } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { 
  ArchiveBoxIcon, 
  WrenchScrewdriverIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BoltIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

export default function TacticalArsenalPage() {
  const { userProfile, loading } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const inventory = useMemo(() => userProfile?.inventory || [], [userProfile]);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || item.type === filterType;
      return matchesSearch && matchesType && item.quantity > 0;
    });
  }, [inventory, searchTerm, filterType]);

  const stats = useMemo(() => {
    const total = inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const unique = inventory.filter(i => i.quantity > 0).length;
    return { total, unique };
  }, [inventory]);

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-orbitron text-emerald-500 animate-pulse tracking-widest uppercase">Initializing Tactical Interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-emerald-500/30">
      
      {/* HUD DECORATION */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-emerald-500/10 opacity-20 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-emerald-500/30"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-emerald-500/30"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-emerald-500/30"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-emerald-500/30"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-emerald-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-emerald-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">ARMORY_DEPT</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest">ASSET_MANAGEMENT_V2</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-emerald-400/80 animate-pulse tracking-widest font-bold uppercase">
                ● STATUS: ENCRYPTED_STORAGE_READY
              </span>
            </div>
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-emerald-500/50 w-fit backdrop-blur-sm">
              GERENCIAMENTO TÁTICO DE COMPONENTES, CHIPS E HARDWARE MILITAR.
            </p>
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="cyber-card p-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 border border-emerald-500/30">
                <ArchiveBoxIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ESTOQUE_TOTAL</p>
                <p className="text-2xl font-orbitron font-black text-white">{stats.total.toLocaleString()} <span className="text-xs text-emerald-500">UDS</span></p>
              </div>
            </div>
          </div>
          <div className="cyber-card p-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 border border-emerald-500/30">
                <CpuChipIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">TIPOS_ÚNICOS</p>
                <p className="text-2xl font-orbitron font-black text-white">{stats.unique} <span className="text-xs text-emerald-500">TYPES</span></p>
              </div>
            </div>
          </div>
          <div className="cyber-card p-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/20 p-3 border border-emerald-500/30">
                <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">CAPACIDADE_CARGA</p>
                <p className="text-2xl font-orbitron font-black text-white">∞ <span className="text-xs text-emerald-500">UNLIMITED</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96 group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <MagnifyingGlassIcon className="w-4 h-4 text-emerald-500" />
             </div>
             <input 
               type="text" 
               placeholder="PESQUISAR HARDWARE..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-black/40 border border-emerald-500/20 focus:border-emerald-500 outline-none p-2 pl-10 font-mono text-xs text-white uppercase tracking-widest transition-all"
               style={MILITARY_CLIP}
             />
           </div>

           <div className="flex gap-2 w-full md:w-auto">
             {["all", "special", "chip", "gear"].map((type) => (
               <button
                 key={type}
                 onClick={() => setFilterType(type)}
                 className={`px-4 py-1.5 font-black text-[9px] uppercase transition-all border ${
                   filterType === type 
                   ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                   : 'bg-black/40 border-emerald-500/20 text-emerald-500/60 hover:border-emerald-500'
                 }`}
                 style={MILITARY_CLIP}
               >
                 {type === 'all' ? 'VER_TUDO' : type}
               </button>
             ))}
           </div>
        </div>

        {/* INVENTORY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => (
                <motion.div
                  key={item.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="cyber-card p-5 group relative hover:border-emerald-500/50 transition-all"
                  style={MILITARY_CLIP}
                >
                  {/* RARITY INDICATOR */}
                  <div className={`absolute top-0 right-0 w-12 h-1 ${
                    item.rarity === 'legendary' ? 'bg-yellow-500' :
                    item.rarity === 'epic' ? 'bg-fuchsia-500' :
                    item.rarity === 'rare' ? 'bg-emerald-400' : 'bg-emerald-500/20'
                  }`}></div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                       <span className="text-[8px] text-emerald-500/60 font-mono tracking-tighter">ITEM_CODE: {item.code.toUpperCase()}</span>
                       <h3 className="text-white font-black font-orbitron tracking-widest text-sm uppercase group-hover:text-emerald-400 transition-colors">
                         {item.name}
                       </h3>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1">
                       <span className="text-emerald-400 font-mono text-xs font-black">x{item.quantity.toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono italic mb-6 min-h-[30px]">
                    {item.description || "Nenhuma descrição técnica disponível para este componente."}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-emerald-500/10">
                     <div className="flex items-center gap-1.5">
                       <div className={`w-2 h-2 rounded-full ${
                         item.rarity === 'legendary' ? 'bg-yellow-500 animate-pulse' :
                         item.rarity === 'epic' ? 'bg-fuchsia-500' :
                         item.rarity === 'rare' ? 'bg-emerald-400' : 'bg-slate-700'
                       }`}></div>
                       <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest">
                         {item.rarity || 'common'}
                       </span>
                     </div>
                     <button className="bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/20 p-2 transition-all">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-emerald-500" />
                     </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/10 opacity-40">
                <ArchiveBoxIcon className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="font-orbitron text-sm tracking-widest uppercase text-emerald-500">ARMORY_EMPTY</p>
                <p className="text-[10px] font-mono text-slate-500 mt-2">NENHUM HARDWARE ENCONTRADO NO BANCO DE DADOS LOCAL.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          <div className="bg-black/80 border border-emerald-500/40 p-4" style={MILITARY_CLIP}>
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-emerald-500 font-orbitron font-black text-[10px] uppercase tracking-widest mb-1">MANUTENÇÃO_SISTEMA</h4>
                <p className="text-[10px] text-emerald-100/90 font-mono italic">
                  Todos os itens são armazenados em cold-storage criptografado. Para vender seus itens, acesse a Shadow Market.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-black/80 border border-emerald-500/40 p-4" style={MILITARY_CLIP}>
            <div className="flex items-start gap-3">
              <BoltIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-emerald-500 font-orbitron font-black text-[10px] uppercase tracking-widest mb-1">EFICIÊNCIA_TÁTICA</h4>
                <p className="text-[10px] text-emerald-100/90 font-mono italic">
                  Chips e módulos de memória podem ser equipados para bônus de combate. Em breve novas funcionalidades estarão online.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto mt-auto pt-8 pb-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-70 relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <span className="text-[8px] font-black tracking-widest uppercase">Inventory_Protocol</span>
             <span className="text-[10px] font-mono text-emerald-500">ARMORY_SYNC_v1.0.0</span>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.5em]">
          UrbanClash Tactical Interface
        </div>
      </footer>
    </div>
  );
}
