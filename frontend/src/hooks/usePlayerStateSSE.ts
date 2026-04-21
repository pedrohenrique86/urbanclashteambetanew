/**
 * usePlayerStateSSE.ts
 *
 * Hook que conecta ao canal SSE privado do jogador (/api/users/state/subscribe)
 * e atualiza o estado React em tempo real quando o backend emite eventos.
 *
 * FLUXO:
 *   Backend emite player:state → SSE → Este hook → setUserProfile (React state)
 *
 * SEM nenhuma chamada HTTP adicional — atualização pura via push do servidor.
 */

import { useEffect, useRef } from "react";
import { tokenStorage } from "../lib/api";

/**
 * Payload enviado pelo backend no evento player:state
 */
export interface PlayerStatePayload {
  type: "player:update";
  playerId: string;
  data: {
    level: number;
    xp: number;
    energy: number;
    maxEnergy: number;
    actionPoints: number;
    attack: number;
    defense: number;
    focus: number;
    critDamage: number;
    critChance: number;
    cash: number;
    intimidation: number;
    discipline: number;
    victories: number;
    defeats: number;
    winningStreak: number;
  };
}

interface UsePlayerStateSSEOptions {
  /** ID do usuário autenticado. Quando null, o hook não conecta. */
  userId: string | null;
  /** Callback chamado cada vez que um evento player:state é recebido. */
  onStateUpdate: (payload: PlayerStatePayload) => void;
}

/**
 * Constrói a URL do SSE de estado do jogador respeitando a mesma lógica do api.ts
 */
function buildPlayerSSEUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!envUrl) return "/api/users/state/subscribe";

  const base = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  // Se já tem /api no final, usa direto
  if (base.endsWith("/api")) return `${base}/users/state/subscribe`;
  return `${base}/api/users/state/subscribe`;
}

export function usePlayerStateSSE({
  userId,
  onStateUpdate,
}: UsePlayerStateSSEOptions): void {
  const mountedRef     = useRef(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStateUpdateRef = useRef(onStateUpdate);

  // Mantém a referência atualizada sem precisar recriar a conexão
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
  });

  useEffect(() => {
    if (!userId) return;

    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;

      // SSE não suporta Authorization header nativo — usamos token na query string
      // O backend precisa aceitar o token via query param (já tratado pelo authenticateToken)
      const token = tokenStorage.getToken();
      const url   = token
        ? `${buildPlayerSSEUrl()}?token=${encodeURIComponent(token)}`
        : buildPlayerSSEUrl();

      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener("player:state", (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const payload: PlayerStatePayload = JSON.parse(e.data);
          // Valida que o evento é para este jogador
          if (payload.playerId === userId) {
            onStateUpdateRef.current(payload);
          }
        } catch (err) {
          console.warn("[playerStateSSE] Falha ao parsear evento:", err);
        }
      });

      es.addEventListener("player:connected", () => {
        if (import.meta.env.DEV) {
          console.debug(`[playerStateSSE] Canal privado conectado para ${userId}`);
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (mountedRef.current) {
          // Reconecta após 5s com backoff
          reconnectRef.current = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [userId]); // Só reconecta se o userId mudar (login/logout)
}
