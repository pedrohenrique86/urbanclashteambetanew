import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useUserProfile";
import { useTheme } from "../contexts/ThemeContext";
import { apiClient } from "../lib/supabaseClient";

type Player = {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  level?: number;
  role?: string;
};

type ClanData = {
  id: string;
  name: string;
  description?: string;
  faction?: "gangsters" | "guardas";
  member_count?: number;
  max_members?: number;
  available_slots?: number;
  score?: number;
  vault?: number;
  members?: Player[];
};

type ChatMessage = {
  id: string;
  user_id: string;
  username?: string;
  content: string;
  created_at: string;
};

export default function ClanPage() {
  const navigate = useNavigate();
  const { themeClasses } = useTheme();
  const { userProfile, loading: profileLoading, setUserProfile } = useUserProfile();
  const [clan, setClan] = useState<ClanData | null>(null);
  const [clanLoading, setClanLoading] = useState<boolean>(true);
  const [clanError, setClanError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [confirmLeave, setConfirmLeave] = useState<boolean>(false);
  const [chatEnabled, setChatEnabled] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"api" | "local">("api");
  const pollIntervalRef = useRef<number>(3000);
  const pollTimerRef = useRef<number | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const factionColor = useMemo(() => {
    const f = clan?.faction || userProfile?.faction;
    return f === "gangsters"
      ? {
          gradient: "from-orange-500 to-orange-700",
          ring: "ring-orange-400",
          accent: "text-orange-400",
        }
      : {
          gradient: "from-blue-500 to-blue-700",
          ring: "ring-blue-400",
          accent: "text-blue-400",
        };
  }, [clan?.faction, userProfile?.faction]);

  const availableSlots = useMemo(() => {
    if (!clan) return 0;
    if (typeof clan.available_slots === "number") return clan.available_slots;
    if (
      typeof clan.max_members === "number" &&
      typeof clan.member_count === "number"
    ) {
      return Math.max(clan.max_members - clan.member_count, 0);
    }
    return 0;
  }, [clan]);

  useEffect(() => {
    if (!profileLoading) {
      if (!userProfile?.clan_id) {
        navigate("/clan-selection", {
          state: { faction: userProfile?.faction },
        });
        return;
      }
      fetchClan(userProfile.clan_id);
    }
  }, [profileLoading, userProfile?.clan_id, userProfile?.faction, navigate]);

  const fetchClan = async (clanId: string) => {
    try {
      setClanLoading(true);
      setClanError(null);
      const data = await apiClient.getClan(clanId);

      const rawClan = data?.clan || data || {};
      const rawMembers = data?.members || rawClan?.members || [];

      let normalized: ClanData = {
        id: rawClan?.id || clanId,
        name: rawClan?.name || "Clã",
        description: rawClan?.description || "",
        faction: rawClan?.faction,
        member_count: Array.isArray(rawMembers)
          ? rawMembers.length
          : (rawClan?.member_count ?? 0),
        max_members: rawClan?.max_members ?? rawClan?.capacity ?? 0,
        available_slots: rawClan?.available_slots,
        score: rawClan?.score ?? rawClan?.strength ?? 0,
        vault: rawClan?.vault ?? rawClan?.cofre ?? 0,
        members: Array.isArray(rawMembers) ? rawMembers : [],
      };

      // Se não vier lista de membros, tentar endpoint dedicado
      if (
        (!normalized.members || normalized.members.length === 0) &&
        normalized.id
      ) {
        try {
          const m = await apiClient.getClanMembers(String(normalized.id));
          const membersList = m?.members || m || [];
          normalized = {
            ...normalized,
            members: Array.isArray(membersList) ? membersList : [],
            member_count: Array.isArray(membersList)
              ? membersList.length
              : normalized.member_count,
          };
        } catch (error) {
          /* silencioso: seguir com membros vazios */
        }
      }

      setClan(normalized);
    } catch (e: unknown) {
      setClanError("Erro ao carregar dados do clã");
    } finally {
      setClanLoading(false);
    }
  };

  const fetchChat = React.useCallback(async () => {
    if (!clan?.id || !chatEnabled) return;

    try {
      if (chatMode === "local") {
        const key = `clan_chat:${clan.id}`;
        const raw = localStorage.getItem(key);
        const parsed: ChatMessage[] = raw ? JSON.parse(raw) : [];
        setChatMessages(parsed);
        setChatError(null);
        return;
      }

      const sinceParam = lastMessageTimeRef.current || undefined;
      let data: { messages: ChatMessage[] } | ChatMessage[] | null = null;

      try {
        data = await apiClient.getClanChat(String(clan.id), sinceParam);
      } catch (err) {
        const qs = sinceParam ? `?since=${encodeURIComponent(sinceParam)}` : "";
        try {
          data = await (apiClient as any).request(
            `/clans/${clan.id}/messages${qs}`,
          );
        } catch (finalError) {
          setChatMode("local");
          try {
            if (!broadcastRef.current) {
              broadcastRef.current = new BroadcastChannel(
                `clan_chat_${clan.id}`,
              );
              broadcastRef.current.onmessage = (ev) => {
                if (ev?.data?.type === "new_message" && ev.data?.message) {
                  setChatMessages((prev) => {
                    const exists = prev.some(
                      (m) => m.id === ev.data.message.id,
                    );
                    if (exists) return prev;
                    const merged = [...prev, ev.data.message];
                    localStorage.setItem(
                      `clan_chat:${clan.id}`,
                      JSON.stringify(merged.slice(-200)),
                    );
                    return merged;
                  });
                }
              };
            }
          } catch (broadcastError) {
            /* Falha ao inicializar BroadcastChannel no fallback */
          }
          const localRaw = localStorage.getItem(`clan_chat:${clan.id}`);
          const localParsed: ChatMessage[] = localRaw
            ? JSON.parse(localRaw)
            : [];
          setChatMessages(localParsed);
          setChatError(null);
          return;
        }
      }

      const messages: ChatMessage[] =
        data && "messages" in data && Array.isArray(data.messages)
          ? data.messages
          : Array.isArray(data)
            ? data
            : [];

      if (messages.length > 0) {
        setChatMessages((prevMessages) => {
          const messageMap = new Map(prevMessages.map((m) => [m.id, m]));
          messages.forEach((m) => messageMap.set(m.id, m));
          const merged = Array.from(messageMap.values());
          merged.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

          if (merged.length > 0) {
            lastMessageTimeRef.current = merged[merged.length - 1].created_at;
          }

          localStorage.setItem(
            `clan_chat:${clan.id}`,
            JSON.stringify(merged.slice(-200)),
          );
          return merged;
        });
        pollIntervalRef.current = 3000;
      } else {
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current + 1000,
          10000,
        );
      }
      setChatError(null);
    } catch (e: unknown) {
      setChatMode("local");
      try {
        if (!broadcastRef.current && clan?.id) {
          broadcastRef.current = new BroadcastChannel(`clan_chat_${clan.id}`);
          broadcastRef.current.onmessage = (ev) => {
            if (ev?.data?.type === "new_message" && ev.data?.message) {
              setChatMessages((prev) => {
                const exists = prev.some((m) => m.id === ev.data.message.id);
                if (exists) return prev;
                const merged = [...prev, ev.data.message];
                localStorage.setItem(
                  `clan_chat:${clan.id}`,
                  JSON.stringify(merged.slice(-200)),
                );
                return merged;
              });
            }
          };
        }
      } catch (broadcastError) {
        /* Falha ao inicializar BroadcastChannel de emergência */
      }
      const localRaw = clan?.id
        ? localStorage.getItem(`clan_chat:${clan.id}`)
        : null;
      const localParsed: ChatMessage[] = localRaw ? JSON.parse(localRaw) : [];
      setChatMessages(localParsed);
      setChatError(null);
    }
  }, [clan?.id, chatEnabled, chatMode, setChatMode, setChatError]);

  const startPolling = React.useCallback(() => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    const tick = () => {
      fetchChat();
      pollTimerRef.current = window.setTimeout(tick, pollIntervalRef.current);
    };
    pollTimerRef.current = window.setTimeout(tick, pollIntervalRef.current);
  }, [fetchChat]);

  useEffect(() => {
    if (clan?.id && chatEnabled) {
      startPolling();
      return () => {
        if (pollTimerRef.current) {
          window.clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
  }, [clan?.id, chatEnabled, startPolling]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (pollTimerRef.current) {
          window.clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      } else {
        if (clan?.id && chatEnabled) {
          startPolling();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clan?.id, chatEnabled, startPolling]);

  const sendMessage = async () => {
    if (!clan?.id || !chatInput.trim()) return;
    try {
      setChatLoading(true);
      const payload = { content: chatInput.trim(), message: chatInput.trim() };
      if (chatMode === "api") {
        try {
          await apiClient.sendClanChat(String(clan.id), payload);
        } catch (err) {
          try {
            await (apiClient as any).request(`/clans/${clan.id}/messages`, {
              method: "POST",
              body: JSON.stringify(payload),
            });
          } catch (finalError) {
            /* Falha no envio da mensagem (fallback), mudando para modo local */
            setChatMode("local");
          }
        }
      }
      if (chatMode === "local") {
        const newMsg: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: String(userProfile?.user_id || userProfile?.id || "me"),
          username: userProfile?.username || "Você",
          content: chatInput.trim(),
          created_at: new Date().toISOString(),
        };
        const merged = [...chatMessages, newMsg];
        setChatMessages(merged);
        localStorage.setItem(
          `clan_chat:${clan.id}`,
          JSON.stringify(merged.slice(-200)),
        );
        try {
          if (!broadcastRef.current) {
            broadcastRef.current = new BroadcastChannel(`clan_chat_${clan.id}`);
          }
          broadcastRef.current.postMessage({
            type: "new_message",
            message: newMsg,
          });
        } catch (broadcastError) {
          /* Falha ao postar mensagem no BroadcastChannel */
        }
      }
      setChatInput("");
      setChatEnabled(true);
      pollIntervalRef.current = 3000;
      if (chatMode === "api") {
        fetchChat();
      }
    } catch (e: unknown) {
      setChatError("Não foi possível enviar a mensagem");
    } finally {
      setChatLoading(false);
    }
  };

  const handleLeaveClan = async () => {
    if (!clan?.id || !userProfile) return;
    try {
      setLeaving(true);
      await apiClient.leaveClan(clan.id);
      // Atualização otimista: remove o clan_id do estado local
      setUserProfile({ ...userProfile, clan_id: undefined });
      // Navega para a página QG, que irá renderizar a seleção de clãs
      navigate("/qg");
    } catch (e: unknown) {
      setClanError("Erro ao sair do clã");
    } finally {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  if (profileLoading || clanLoading) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}
      >
        <div className="animate-spin h-8 w-8 border-4 border-gray-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (clanError) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}
      >
        <div
          className={`${themeClasses.cardBg} p-6 rounded-lg border ${themeClasses.border} text-center`}
        >
          <p className="text-red-400 mb-4">{clanError}</p>
          <button
            type="button"
            onClick={() => fetchClan(String(userProfile?.clan_id))}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen ${themeClasses.bg} text-white font-exo max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-6`}
    >
      <div
        className={`rounded-xl p-6 bg-gradient-to-r ${factionColor.gradient} shadow-xl ring-2 ${factionColor.ring}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-orbitron font-extrabold tracking-tight">
              {clan?.name || "Clã"}
            </h1>
            <p className="text-sm text-white/80 mt-1">
              {clan?.description || "Sem descrição"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="px-4 py-2 bg-black/30 hover:bg-black/40 rounded-lg text-white font-bold border border-white/30 transition-colors"
          >
            Sair do Clã
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`${themeClasses.cardBg} rounded-xl p-4 border ${themeClasses.border} shadow`}
        >
          <div className="text-xs text-gray-400">Força do Clã</div>
          <div className="text-3xl font-extrabold mt-1">{clan?.score ?? 0}</div>
        </div>
        <div
          className={`${themeClasses.cardBg} rounded-xl p-4 border ${themeClasses.border} shadow`}
        >
          <div className="text-xs text-gray-400">Cofre</div>
          <div className="text-3xl font-extrabold mt-1">
            R$ {(clan?.vault ?? 0).toLocaleString("pt-BR")}
          </div>
        </div>
        <div
          className={`${themeClasses.cardBg} rounded-xl p-4 border ${themeClasses.border} shadow`}
        >
          <div className="text-xs text-gray-400">Vagas</div>
          <div className="text-3xl font-extrabold mt-1">
            {clan?.member_count ?? 0}/{clan?.max_members ?? 0}{" "}
            <span className="text-sm text-gray-400">
              ({availableSlots} livres)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow overflow-hidden`}
          >
            <div className="px-4 py-3 border-b ${themeClasses.border} flex items-center justify-between">
              <h2 className="text-lg font-bold">Membros</h2>
              <span className={`text-xs font-bold ${factionColor.accent}`}>
                {clan?.members?.length ?? clan?.member_count ?? 0} membros
              </span>
            </div>
            <ul className="divide-y divide-gray-700/60">
              {(clan?.members ?? []).map((m: Player) => {
                const mid = String(m.id || m.user_id);
                const voterId = String(
                  userProfile?.user_id || userProfile?.id || "me",
                );
                const keyVotes = clan?.id ? `clan_votes:${clan.id}:${mid}` : "";
                let votesSize = 0;
                if (keyVotes) {
                  try {
                    const lst = JSON.parse(
                      localStorage.getItem(keyVotes) || "[]",
                    );
                    votesSize = Array.isArray(lst) ? lst.length : 0;
                  } catch (e) {
                    /* Falha ao parsear votos do localStorage */
                  }
                }
                const total = clan?.members?.length ?? clan?.member_count ?? 1;
                const threshold = Math.ceil(total / 2);
                const isSelf = voterId === mid;
                const banKey = clan?.id ? `clan_banlist:${clan.id}` : "";
                let isBanned = false;
                if (banKey) {
                  try {
                    const obj: { [key: string]: string } = JSON.parse(
                      localStorage.getItem(banKey) || "{}",
                    );
                    const exp = obj[mid];
                    isBanned = !!exp && new Date(exp).getTime() > Date.now();
                  } catch (e) {
                    /* Falha ao parsear banlist do localStorage */
                  }
                }
                return (
                  <li
                    key={mid}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center font-bold">
                        {(m.username || m.display_name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <span>
                            {m.username || m.display_name || "Usuário"}
                          </span>
                          {isBanned && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/40 border border-red-500/50">
                              BANIDO 24h
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Nível {m.level ?? "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-400">
                        {m.role || "Membro"}
                      </div>
                      {!isSelf && !isBanned && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!clan?.id) return;
                            const key = `clan_votes:${clan.id}:${mid}`;
                            let setVotes = new Set<string>();
                            try {
                              const arr = JSON.parse(
                                localStorage.getItem(key) || "[]",
                              );
                              if (Array.isArray(arr)) setVotes = new Set(arr);
                            } catch (e) {
                              /* Falha ao parsear votos do localStorage para votar */
                            }
                            setVotes.add(voterId);
                            localStorage.setItem(
                              key,
                              JSON.stringify(Array.from(setVotes)),
                            );
                            const totalMembers =
                              clan?.members?.length ?? clan?.member_count ?? 1;
                            const th = Math.ceil(totalMembers / 2);
                            if (setVotes.size >= th) {
                              try {
                                await apiClient.kickMember(
                                  String(clan.id),
                                  mid,
                                );
                              } catch (e) {
                                /* Ignorar erro ao kickar, o processo continua */
                                const bKey = `clan_banlist:${clan.id}`;
                                const obj: { [key: string]: string } = {};
                                try {
                                  const existing = localStorage.getItem(bKey);
                                  if (existing) {
                                    Object.assign(obj, JSON.parse(existing));
                                  }
                                } catch (parseError) {
                                  /* Falha ao parsear banlist */
                                }
                                obj[mid] = new Date(
                                  Date.now() + 24 * 3600 * 1000,
                                ).toISOString();
                                localStorage.setItem(bKey, JSON.stringify(obj));
                              }
                              // remover da lista local
                              setClan((prev) => {
                                if (!prev) return prev;
                                const filtered = (prev.members || []).filter(
                                  (member) =>
                                    String(member.id || member.user_id) !== mid,
                                );
                                return {
                                  ...prev,
                                  members: filtered,
                                  member_count: filtered.length,
                                };
                              });
                            } else {
                              // atualizar UI de votos
                              try {
                                const arr2 = JSON.parse(
                                  localStorage.getItem(key) || "[]",
                                );
                                votesSize = Array.isArray(arr2)
                                  ? arr2.length
                                  : setVotes.size;
                              } catch {
                                /* Silently ignore update error */
                              }
                            }
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 transition-colors font-bold"
                          title={`Votos: ${votesSize}/${threshold}`}
                        >
                          Votar expulsão ({votesSize}/{threshold})
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {(!clan?.members || clan.members.length === 0) && (
                <li className="px-4 py-6 text-center text-gray-400">
                  Nenhum membro listado
                </li>
              )}
            </ul>
            {(clan?.members?.length ?? clan?.member_count ?? 0) <= 1 && (
              <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-700/60">
                Adicione mais membros para habilitar a votação de expulsão.
              </div>
            )}
          </div>

          <div
            className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow overflow-hidden`}
          >
            <div className="px-4 py-3 border-b ${themeClasses.border} flex items-center justify-between">
              <h2 className="text-lg font-bold">Chat do Clã</h2>
              <div className="flex items-center gap-2">
                {!chatEnabled && (
                  <span className="text-xs text-yellow-400">Indisponível</span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded ${chatMode === "local" ? "bg-yellow-400 text-black" : "bg-green-500 text-black"}`}
                >
                  {chatMode === "local" ? "Modo Local" : "Online"}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="text-sm text-gray-400">Sem mensagens</div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center font-bold text-xs">
                    {(msg.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">
                      {msg.username || "Usuário"} •{" "}
                      {new Date(msg.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-sm font-semibold">{msg.content}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700/60 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escreva uma mensagem"
                className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  !chatEnabled || chatLoading || chatInput.trim().length === 0
                }
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors font-bold"
              >
                Enviar
              </button>
            </div>
            {chatError && (
              <div className="px-4 py-2 text-xs text-yellow-400">
                {chatError}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow p-4`}
          >
            <div className="text-sm text-gray-300 font-bold mb-2">Ações</div>
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-500 transition-colors font-bold"
            >
              Sair do Clã
            </button>
            <div className="text-xs text-gray-400 mt-2">
              Ao sair, você só poderá retornar a este clã após 24h reais.
            </div>
          </div>
        </div>
      </div>

      {confirmLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-6 w-[90%] max-w-md`}
          >
            <div className="text-lg font-bold mb-2">
              Confirmar saída do clã?
            </div>
            <div className="text-sm text-gray-300 mb-4">
              Você só poderá entrar novamente neste clã após 24 horas reais.
              Deseja continuar?
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmLeave(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLeaveClan}
                disabled={leaving}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors font-bold"
              >
                {leaving ? "Saindo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}