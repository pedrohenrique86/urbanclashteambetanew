/**
 * HUD Cache System
 * Cache leve e robusto para evitar requisições redundantes ao abrir painéis HUD.
 * Armazena dados de usuários e clãs em memória, com TTL e controle de requests em andamento.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

const profileCache = new Map<string, CacheEntry<unknown>>();
const clanCache = new Map<string, CacheEntry<unknown>>();

const pendingProfileRequests = new Map<string, Promise<unknown>>();
const pendingClanRequests = new Map<string, Promise<unknown>>();

const isExpired = (timestamp: number) => {
  return Date.now() - timestamp > CACHE_DURATION;
};

export const HUDCache = {
  // -------------------------
  // PERFIL DE USUÁRIO
  // -------------------------
  getProfile<T>(userId: string): T | null {
    if (!userId) return null;

    const entry = profileCache.get(userId);
    if (!entry) return null;

    if (isExpired(entry.timestamp)) {
      profileCache.delete(userId);
      return null;
    }

    return entry.data as T;
  },

  setProfile<T>(userId: string, data: T) {
    if (!userId) return;

    profileCache.set(userId, {
      data,
      timestamp: Date.now(),
    });
  },

  getPendingProfile<T>(userId: string): Promise<T> | null {
    if (!userId) return null;
    return (pendingProfileRequests.get(userId) as Promise<T>) ?? null;
  },

  setPendingProfile<T>(userId: string, promise: Promise<T>) {
    if (!userId) return;
    pendingProfileRequests.set(userId, promise);
  },

  clearPendingProfile(userId: string) {
    if (!userId) return;
    pendingProfileRequests.delete(userId);
  },

  invalidateProfile(userId: string) {
    if (!userId) return;
    profileCache.delete(userId);
    pendingProfileRequests.delete(userId);
  },

  // -------------------------
  // DADOS DE CLÃ
  // -------------------------
  getClan<T>(clanId: string): T | null {
    if (!clanId) return null;

    const entry = clanCache.get(clanId);
    if (!entry) return null;

    if (isExpired(entry.timestamp)) {
      clanCache.delete(clanId);
      return null;
    }

    return entry.data as T;
  },

  setClan<T>(clanId: string, data: T) {
    if (!clanId) return;

    clanCache.set(clanId, {
      data,
      timestamp: Date.now(),
    });
  },

  getPendingClan<T>(clanId: string): Promise<T> | null {
    if (!clanId) return null;
    return (pendingClanRequests.get(clanId) as Promise<T>) ?? null;
  },

  setPendingClan<T>(clanId: string, promise: Promise<T>) {
    if (!clanId) return;
    pendingClanRequests.set(clanId, promise);
  },

  clearPendingClan(clanId: string) {
    if (!clanId) return;
    pendingClanRequests.delete(clanId);
  },

  invalidateClan(clanId: string) {
    if (!clanId) return;
    clanCache.delete(clanId);
    pendingClanRequests.delete(clanId);
  },

  // -------------------------
  // LIMPEZA GERAL
  // -------------------------
  clear() {
    profileCache.clear();
    clanCache.clear();
    pendingProfileRequests.clear();
    pendingClanRequests.clear();
  },

  cleanupExpired() {
    for (const [key, value] of profileCache.entries()) {
      if (isExpired(value.timestamp)) {
        profileCache.delete(key);
      }
    }

    for (const [key, value] of clanCache.entries()) {
      if (isExpired(value.timestamp)) {
        clanCache.delete(key);
      }
    }
  },
};