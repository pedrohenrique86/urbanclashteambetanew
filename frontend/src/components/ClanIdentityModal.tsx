import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "../lib/supabaseClient";
import { HUDCache } from "../hooks/useHUDCache";
import { getDisplayName } from "../utils/displayNames";

interface ClanIdentityModalProps {
  clanId: string;
  onClose: () => void;
}

interface ClanData {
  id: string;
  name: string;
  description?: string;
  faction?: "gangsters" | "guardas";
  score?: number;
  member_count?: number;
  max_members?: number;
  vault?: number;
}

const ClanIdentityModal = React.memo(
  ({ clanId, onClose }: ClanIdentityModalProps) => {
    const [clan, setClan] = useState<ClanData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;

      async function load() {
        if (!clanId) {
          if (isMounted) {
            setClan(null);
            setLoading(false);
          }
          return;
        }

        const cached = HUDCache.getClan<ClanData>(clanId);
        if (cached) {
          if (isMounted) {
            setClan(cached);
            setLoading(false);
          }
          return;
        }

        const pending = HUDCache.getPendingClan<ClanData>(clanId);
        if (pending) {
          try {
            const data = await pending;
            if (isMounted) {
              setClan(data);
              setLoading(false);
            }
          } catch (err) {
            console.error("Erro ao aguardar cache pendente do clã:", err);
            if (isMounted) {
              setClan(null);
              setLoading(false);
            }
          }
          return;
        }

        try {
          if (isMounted) {
            setLoading(true);
          }

          const request = apiClient.getClan(clanId).then((data: any) => {
            const clanData = data?.clan || data || null;
            if (clanData) {
              HUDCache.setClan<ClanData>(clanId, clanData);
            }
            return clanData;
          });

          HUDCache.setPendingClan(clanId, request);

          const clanData = await request;

          if (isMounted) {
            setClan(clanData);
          }
        } catch (err) {
          console.error("Erro ao carregar clã:", err);
          if (isMounted) {
            setClan(null);
          }
        } finally {
          HUDCache.clearPendingClan(clanId);
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        isMounted = false;
      };
    }, [clanId]);

    if (!clanId) return null;

    const factionStyles =
      clan?.faction === "gangsters"
        ? "border-orange-500/40 bg-gradient-to-br from-orange-600/60 to-stone-950/90"
        : "border-blue-500/40 bg-gradient-to-br from-blue-600/60 to-stone-950/90";

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 md:left-48">
          <motion.button
            type="button"
            aria-label="Fechar painel da divisão"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] custom-scrollbar"
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-stone-900/80 p-12 text-white backdrop-blur-xl">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500" />
                <p className="animate-pulse font-orbitron text-[10px] text-purple-400">
                  ESCANEANDO REDE DE DIVISÕES...
                </p>
              </div>
            ) : clan ? (
              <div
                className={`relative w-full rounded-2xl border-2 p-6 font-exo text-white shadow-2xl backdrop-blur-md ${factionStyles}`}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
                  title="Fechar Painel (ESC)"
                  aria-label="Fechar painel"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="font-orbitron text-3xl font-extrabold uppercase italic tracking-tighter">
                      {clan.name || "Divisão"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                      {clan.description || "Sem descrição disponível."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-center">
                      <p className="font-orbitron text-[10px] text-gray-500">
                        PONTUAÇÃO
                      </p>
                      <p className="text-xl font-bold text-yellow-500">
                        {clan.score || 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-center">
                      <p className="font-orbitron text-[10px] text-gray-500">
                        MORADORES
                      </p>
                      <p className="text-xl font-bold">
                        {clan.member_count || 0}/{clan.max_members || 20}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-center">
                      <p className="font-orbitron text-[10px] text-gray-500">
                        COFRE
                      </p>
                      <p className="text-xl font-bold text-green-500">
                        ${(clan.vault || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Este clã pertence à facção{" "}
                      <span className="font-bold uppercase text-white">
                        {getDisplayName(clan.faction || "desconhecida")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-500/50 bg-stone-900/90 p-8 text-center text-white">
                <p className="text-red-400">
                  Divisão não localizada na Digital Link.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 rounded-lg bg-gray-800 px-6 py-2"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

ClanIdentityModal.displayName = "ClanIdentityModal";

export default ClanIdentityModal;