import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "mobile_drawer_order_v1";
const DEBOUNCE_MS = 600;

function normalizeOrder(saved: unknown, defaultOrder: string[]): string[] {
  if (!Array.isArray(saved)) return defaultOrder;

  const savedStrings = saved.filter((item): item is string => typeof item === "string");

  const preserved = savedStrings.filter((item) => defaultOrder.includes(item));
  const missing = defaultOrder.filter((item) => !preserved.includes(item));

  return [...preserved, ...missing];
}

export function useDrawerOrder(
  defaultOrder: string[]
): [string[], (newOrder: string[] | ((prev: string[]) => string[])) => void] {
  const [order, setOrderState] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultOrder;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultOrder;

      const parsed = JSON.parse(raw);
      return normalizeOrder(parsed, defaultOrder);
    } catch {
      return defaultOrder;
    }
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const setOrder = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setOrderState((prev) => {
        const nextRaw = typeof updater === "function" ? updater(prev) : updater;
        const next = normalizeOrder(nextRaw, defaultOrder);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // localStorage pode estar cheio ou bloqueado (modo incógnito) — falha silenciosa intencional
          }
        }, DEBOUNCE_MS);

        return next;
      });
    },
    [defaultOrder]
  );

  return [order, setOrder];
}