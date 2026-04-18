import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "mobile_drawer_data_v1";
const DEBOUNCE_MS = 600;

export interface DrawerFolder {
  id: string;
  name: string;
  items: string[];
  color?: string;
}

export interface DrawerData {
  order: string[];
  folders: Record<string, DrawerFolder>;
}

function normalizeData(saved: unknown, defaultOrder: string[]): DrawerData {
  const base: DrawerData = { order: [...defaultOrder], folders: {} };
  
  if (!saved || typeof saved !== "object") return base;
  
  const savedData = saved as Partial<DrawerData>;
  const order = Array.isArray(savedData.order) ? savedData.order.filter(i => typeof i === "string") : [];
  const folders = savedData.folders && typeof savedData.folders === "object" ? savedData.folders : {};

  // Validar folders guardando IDs
  const validFolders: Record<string, DrawerFolder> = {};
  for (const [key, value] of Object.entries(folders)) {
    if (value && typeof value === 'object' && typeof (value as any).name === 'string' && Array.isArray((value as any).items)) {
      validFolders[key] = {
        id: key,
        name: (value as any).name,
        color: (value as any).color,
        items: (value as any).items.filter((i: any) => typeof i === "string")
      };
    }
  }

  // Filtrar ordem para itens que existem no defaultOrder OU nas pastas válidas
  const preservedItems = order.filter(item => defaultOrder.includes(item) || validFolders[item]);
  
  // Pegar todos os itens que já estão dentro de pastas
  const itemsInFolders = new Set<string>();
  Object.values(validFolders).forEach(f => f.items.forEach(i => itemsInFolders.add(i)));

  // Encontrar itens que estão faltando (não estão na ordem principal nem em pastas)
  const missingItems = defaultOrder.filter(item => !preservedItems.includes(item) && !itemsInFolders.has(item));

  return {
    order: [...preservedItems, ...missingItems],
    folders: validFolders
  };
}

export function useDrawerOrder(
  defaultOrder: string[]
): [DrawerData, (updater: DrawerData | ((prev: DrawerData) => DrawerData)) => void] {
  const [data, setDataState] = useState<DrawerData>(() => {
    if (typeof window === "undefined") return { order: defaultOrder, folders: {} };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { order: defaultOrder, folders: {} };

      const parsed = JSON.parse(raw);
      return normalizeData(parsed, defaultOrder);
    } catch {
      return { order: defaultOrder, folders: {} };
    }
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore errors
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [data]);

  const setData = useCallback(
    (updater: DrawerData | ((prev: DrawerData) => DrawerData)) => {
      setDataState((prev) => {
        const nextRaw = typeof updater === "function" ? updater(prev) : updater;
        return normalizeData(nextRaw, defaultOrder);
      });
    },
    [defaultOrder]
  );

  return [data, setData];
}