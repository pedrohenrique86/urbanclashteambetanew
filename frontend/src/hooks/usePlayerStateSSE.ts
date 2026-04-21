/**
 * usePlayerStateSSE.ts
 *
 * Hook que conecta ao canal SSE privado do jogador (/api/users/state/subscribe)
 * e entrega eventos PATCH (apenas campos modificados) ao callback.
 *
 * FEATURES:
 *   - Reconnect com backoff exponencial (1s → 2s → 4s → 8s → max 30s)
 *   - Versão incremental para detectar eventos fora de ordem
 *   - Keep-alive listener (pings do servidor são ignorados silenciosamente)
 *   - Cleanup completo no unmount (sem memory leaks)
 *   - Token NUNCA enviado em header (SSE nativo não suporta) — query param sanitizado no backend
 */

import { useEffect, useRef } from "react";
import { tokenStorage } from "../lib/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────────

/**
 * Patch enviado pelo backend: apenas os campos que mudaram, em camelCase.
 * Todos os valores são numéricos.
 */
export interface PlayerStatePatch {
  level?         : number;
  xp?            : number;
  energy?        : number;
  maxEnergy?     : number;
  actionPoints?  : number;
  attack?        : number;
  defense?       : number;
  focus?         : number;
  critDamage?    : number;
  critChance?    : number;
  cash?          : number;
  intimidation?  : number;
  discipline?    : number;
  victories?     : number;
  defeats?       : number;
  winningStreak? : number;
}

/**
 * Payload completo do evento player:state emitido pelo backend.
 * type: "player:patch"  → merge incremental (campos alterados)
 */
export interface PlayerStatePayload {
  type    : "player:patch";
  patch   : PlayerStatePatch;
  version : number;
}

interface UsePlayerStateSSEOptions {
  userId       : string | null;
  onStateUpdate: (payload: PlayerStatePayload) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────

function buildSSEUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!envUrl) return "/api/users/state/subscribe";
  const base = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  return base.endsWith("/api")
    ? `${base}/users/state/subscribe`
    : `${base}/api/users/state/subscribe`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────────

export function usePlayerStateSSE({
  userId,
  onStateUpdate,
}: UsePlayerStateSSEOptions): void {
  const mountedRef       = useRef(true);
  const esRef            = useRef<EventSource | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef       = useRef(1000);         // ms — duplica a cada retry, max 30s
  const lastVersionRef   = useRef(0);            // versão do último patch recebido
  const onUpdateRef      = useRef(onStateUpdate);

  // Mantém referência atualizada sem recriar a conexão
  useEffect(() => {
    onUpdateRef.current = onStateUpdate;
  });

  useEffect(() => {
    if (!userId) return;

    mountedRef.current = true;
    backoffRef.current = 1000;

    const connect = () => {
      if (!mountedRef.current) return;

      const token = tokenStorage.getToken();
      const url   = token
        ? `${buildSSEUrl()}?token=${encodeURIComponent(token)}`
        : buildSSEUrl();

      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      // ── Evento principal: player:state (PATCH mínimo) ─────────────────────────
      es.addEventListener("player:state", (e: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const payload = JSON.parse(e.data) as PlayerStatePayload;

          // Verifica se é um patch válido
          if (payload.type !== "player:patch" || !payload.patch) return;

          // Verifica versão — descarta eventos fora de ordem
          if (payload.version <= lastVersionRef.current) {
            if (import.meta.env.DEV) {
              console.debug(
                `[playerSSE] Patch v${payload.version} descartado (último: v${lastVersionRef.current})`,
              );
            }
            return;
          }

          lastVersionRef.current = payload.version;
          onUpdateRef.current(payload);
        } catch (err) {
          console.warn("[playerSSE] Falha ao parsear evento:", err);
        }
      });

      // ── Confirmação de conexão ────────────────────────────────────────────────
      es.addEventListener("player:connected", () => {
        backoffRef.current = 1000; // Reset backoff ao conectar com sucesso
        lastVersionRef.current = 0; // Reset versão (nova sessão)
        if (import.meta.env.DEV) {
          console.debug(`[playerSSE] Canal privado conectado — userId: ${userId}`);
        }
      });

      // ── Erro / reconexão com backoff exponencial ──────────────────────────────
      es.onerror = () => {
        es.close();
        esRef.current = null;

        if (!mountedRef.current) return;

        const delay = Math.min(backoffRef.current, 30_000);
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);

        if (import.meta.env.DEV) {
          console.debug(`[playerSSE] Erro — reconectando em ${delay}ms...`);
        }

        reconnectRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [userId]);
}
