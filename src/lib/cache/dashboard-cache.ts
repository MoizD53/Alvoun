/**
 * Shared Multi-Admin In-Memory Cache with In-Flight Deduplication (Single-Flight)
 * 
 * Ensures multiple concurrent admins viewing the dashboard share the same query
 * promise and cached results, preventing Turso Rows-Read multiplication.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const globalForCache = globalThis as unknown as {
  sharedDashboardCache?: Map<string, CacheEntry<any>>;
  inflightPromises?: Map<string, Promise<any>>;
};

const cache = globalForCache.sharedDashboardCache ?? new Map<string, CacheEntry<any>>();
const inflight = globalForCache.inflightPromises ?? new Map<string, Promise<any>>();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.sharedDashboardCache = cache;
  globalForCache.inflightPromises = inflight;
}

/**
 * Fetch with single-flight request deduplication and in-memory TTL caching.
 * If 6 admins request the dashboard simultaneously, only ONE query executes against Turso.
 */
export async function getOrComputeCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  // Deduplicate concurrent in-flight executions across all admin sessions
  const currentPromise = inflight.get(key);
  if (currentPromise) {
    return currentPromise as Promise<T>;
  }

  const p = (async () => {
    try {
      const data = await fetcher();
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/**
 * Invalidate specific cache keys or all dashboard keys when a mutation happens.
 */
export function invalidateDashboardCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.includes(pattern)) {
      cache.delete(k);
    }
  }
}
