import React, { useState, useEffect, useCallback } from "react";
import { useUserProfile } from "../hooks/useUserProfile";
import { marketService } from "../services/marketService";
import { useToast } from "../contexts/ToastContext";
import { 
  BanknotesIcon, 
  ShoppingCartIcon, 
  ArrowPathIcon,
  CircleStackIcon,
  ArchiveBoxIcon,
  InformationCircleIcon,
  ChevronDoubleUpIcon
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { getRarityColor } from "../utils/rarity";

const MILITARY_CLIP = { clipPath: "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)" };

interface MarketItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  base_price: number;
  market_stock: number;
}

export default function DarkMarketPage() {
  const { userProfile, refreshProfile } = useUserProfile();
  const { showToast } = useToast();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const fetchItems = useCallback(async () => {
    try {
      const data = await marketService.getItems();
      setItems(data);
      // SÊNIOR: Só inicializa se o estado estiver vazio para evitar loop infinito
      setQuantities(prev => {
        const newQtys = { ...prev };
        let changed = false;
        data.forEach((item: MarketItem) => {
          if (!newQtys[item.code]) {
            newQtys[item.code] = 1;
            changed = true;
          }
        });
        return changed ? newQtys : prev;
      });
    } catch (err: any) {
      showToast("Falha ao carregar a Bolsa Sombria.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchItems();
    
    // SÊNIOR: Sistema de Atualização em Tempo Real (SSE -> Evento Customizado)
    // Isso evita que o jogador precise dar refresh para ver o estoque mudar.
    const handleMarketUpdate = (e: any) => {
      const { itemCode, newStock } = e.detail;
      setItems(prev => prev.map(item => 
        item.code === itemCode ? { ...item, market_stock: newStock } : item
      ));
    };

    window.addEventListener("urbanclash:market_update", handleMarketUpdate);
    return () => window.removeEventListener("urbanclash:market_update", handleMarketUpdate);
  }, [fetchItems]);

  const handleAction = async (code: string, action: 'buy' | 'sell') => {
    const qty = quantities[code] || 1;
    if (qty <= 0) return;

    setActionLoading(`${action}-${code}`);
    try {
      if (action === 'buy') {
        const res = await marketService.buyItem(code, qty);
        showToast(res.message, "success");
      } else {
        const res = await marketService.sellItem(code, qty);
        showToast(res.message, "success");
      }
      
      // Reset da quantidade para o próximo trade
      updateQuantity(code, 1);

      // Atualização paralela e imediata do estado
      await Promise.all([
        refreshProfile(true),
        fetchItems()
      ]);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const updateQuantity = (code: string, val: number) => {
    setQuantities(prev => ({ ...prev, [code]: Math.max(1, val) }));
  };

  const setMaxQuantity = (item: MarketItem, action: 'buy' | 'sell') => {
    if (action === 'buy') {
      const maxBuy = Math.floor((userProfile?.money || 0) / item.base_price);
      // Limitamos ao estoque real do mercado vindo do BD
      updateQuantity(item.code, Math.min(item.market_stock || 0, Math.max(1, maxBuy)));
    } else {
      const invItem = userProfile?.inventory?.find((i: any) => i.code === item.code);
      updateQuantity(item.code, Math.max(1, invItem?.quantity || 1));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-orbitron text-fuchsia-500 animate-pulse tracking-widest uppercase">Acessando Rede Sombria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-transparent relative text-slate-300 font-sans selection:bg-fuchsia-500/30">
      
      {/* HUD DECORATION */}
      <div className="fixed inset-0 pointer-events-none border-[1px] border-fuchsia-500/10 opacity-30 m-4 hidden md:block z-0">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-fuchsia-500/50"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-fuchsia-500/50"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-fuchsia-500/50"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-fuchsia-500/50"></div>
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-12 relative z-10">
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-fuchsia-500 shadow-[0_0_15px_rgba(192,38,211,0.8)]"></div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center overflow-hidden border border-fuchsia-500/40 bg-black/60" style={MILITARY_CLIP}>
                <div className="bg-fuchsia-500 px-2 py-0.5">
                   <span className="text-[9px] font-black text-black uppercase">SEC_MARKET</span>
                </div>
                <div className="px-3 py-0.5">
                   <span className="text-[10px] font-mono text-fuchsia-400 font-bold tracking-widest">ENCRYPTED_TRADING_V4</span>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-800"></div>
              <span className="text-[10px] font-mono text-fuchsia-400/80 animate-pulse tracking-widest font-bold uppercase">
                ● COTAÇÃO_EM_TEMPO_REAL
              </span>
            </div>
            <p className="text-slate-300 text-[10px] font-mono tracking-[0.2em] uppercase bg-white/5 py-1 px-3 border-l-2 border-fuchsia-500/50 w-fit backdrop-blur-sm">
              MERCADO NEGRO DE HARDWARE E BIOTECNOLOGIA. COMPRE NA BAIXA, VENDA NA ALTA.
            </p>
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* MARKET INFO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="cyber-card p-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="bg-violet-500/20 p-3 border border-violet-500/30">
                <ArchiveBoxIcon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">TOTAL_EM_ESTOQUE_PESSOAL</p>
                <p className="text-2xl font-orbitron font-black text-white">
                  {userProfile?.inventory?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0} UDS
                </p>
              </div>
            </div>
          </div>
          <div className="cyber-card p-6" style={MILITARY_CLIP}>
            <div className="flex items-center gap-4">
              <div className="bg-rose-500/20 p-3 border border-rose-500/30">
                <ArrowPathIcon className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">TAXA_DE_REDE</p>
                <p className="text-2xl font-orbitron font-black text-white">10.0% <span className="text-[10px] text-rose-400">FIXO</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* MARKET ITEMS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((item, idx) => {
            const invItem = userProfile?.inventory?.find((i: any) => i.code === item.code);
            const sellPrice = Math.floor(item.base_price * 0.9);
            const isRarityHigh = item.rarity === 'legendary' || item.rarity === 'epic';
            const canAffordBuy = (userProfile?.money || 0) >= (item.base_price * (quantities[item.code] || 1));
            const hasEnoughToSell = (invItem?.quantity || 0) >= (quantities[item.code] || 1);

            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-black/40 backdrop-blur-md border border-white/5 p-4 group hover:bg-white/5 transition-all"
                style={MILITARY_CLIP}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Left: Info & Rarity */}
                  <div className="flex-1 flex gap-3">
                    <div className={`w-1 h-full min-h-[40px] ${
                      item.rarity === 'legendary' ? 'bg-yellow-500' : 
                      item.rarity === 'epic' ? 'bg-fuchsia-500' : 
                      item.rarity === 'rare' ? 'bg-violet-500' : 'bg-fuchsia-500/50'
                    } shadow-[0_0_8px_currentColor]`}></div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-black font-orbitron tracking-wider text-sm uppercase ${getRarityColor(item.rarity)}`}>
                          {item.name}
                        </span>
                        {isRarityHigh && (
                          <span className="text-[7px] px-1 bg-white/10 text-white border border-white/20 uppercase font-bold">Elite</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono italic line-clamp-1">{item.description}</p>
                      <span className="text-[8px] text-fuchsia-500/60 font-black uppercase tracking-tighter">Estoque Rede: {item.market_stock?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  {/* Right: Prices & Stock */}
                  <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start gap-4 sm:gap-1">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-mono text-slate-500 uppercase">Seu Estoque</span>
                      <span className={`text-sm font-black font-orbitron ${invItem?.quantity > 0 ? 'text-white' : 'text-slate-700'}`}>
                        {invItem?.quantity?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[7px] font-mono text-fuchsia-500 uppercase">Compra</span>
                        <span className="font-mono text-fuchsia-400 font-bold text-xs">${item.base_price.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[7px] font-mono text-rose-500 uppercase">Venda</span>
                        <span className="font-mono text-rose-400/80 font-bold text-xs">${sellPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Controls */}
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 bg-black/40 p-1 border border-white/5 rounded-sm">
                    <input 
                      type="number" 
                      min="1"
                      value={quantities[item.code] || 1}
                      onChange={(e) => updateQuantity(item.code, parseInt(e.target.value))}
                      className="w-16 bg-transparent text-center font-mono text-xs text-white outline-none"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => setMaxQuantity(item, 'buy')} className="text-[7px] font-black text-fuchsia-500 bg-fuchsia-500/10 px-1 border border-fuchsia-500/20 hover:bg-fuchsia-500/20">MAX_C</button>
                      <button onClick={() => setMaxQuantity(item, 'sell')} className="text-[7px] font-black text-rose-500 bg-rose-500/10 px-1 border border-rose-500/20 hover:bg-rose-500/20">MAX_V</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(item.code, 'buy')}
                      disabled={actionLoading !== null || !canAffordBuy}
                      className={`px-4 py-2 flex items-center gap-2 font-black text-[9px] uppercase transition-all
                        ${!canAffordBuy 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                          : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_10px_rgba(192,38,211,0.3)] active:scale-95'}`}
                      style={MILITARY_CLIP}
                    >
                      {actionLoading === `buy-${item.code}` ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <ShoppingCartIcon className="w-3 h-3" />}
                      Comprar
                    </button>
                    <button
                      onClick={() => handleAction(item.code, 'sell')}
                      disabled={actionLoading !== null || !hasEnoughToSell}
                      className={`px-4 py-2 flex items-center gap-2 font-black text-[9px] uppercase transition-all
                        ${!hasEnoughToSell
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] active:scale-95'}`}
                      style={MILITARY_CLIP}
                    >
                      {actionLoading === `sell-${item.code}` ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <CircleStackIcon className="w-3 h-3" />}
                      Vender
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* WARNING PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          <div className="bg-black/80 border border-red-500/40 p-4" style={MILITARY_CLIP}>
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-red-500 font-orbitron font-black text-[10px] uppercase tracking-widest mb-1">PROTOCOLO_SEGURANÇA</h4>
                <p className="text-[10px] text-red-100/90 font-mono italic">
                  Todas as transações na Bolsa Sombria são irreversíveis. A rede cobra 10% de taxa operacional sobre qualquer venda de hardware.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-black/80 border border-fuchsia-500/40 p-4" style={MILITARY_CLIP}>
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-fuchsia-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-fuchsia-500 font-orbitron font-black text-[10px] uppercase tracking-widest mb-1">DICA_DE_ESTRATEGIA</h4>
                <p className="text-[10px] text-fuchsia-100/90 font-mono italic">
                  Os itens da Bolsa Sombria podem ser obtidos gratuitamente através de roubos bem-sucedidos por Renegados ou interceptações de Guardiões.
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
             <span className="text-[8px] font-black tracking-widest uppercase">Encryption</span>
             <span className="text-[10px] font-mono">P2P_SHADOW_NET_V4</span>
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.5em]">
          UrbanClash Shadow Interface v1.0.0
        </div>
      </footer>
    </div>
  );
}
