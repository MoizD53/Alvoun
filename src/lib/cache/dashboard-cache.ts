/**
 * Shared Multi-Admin In-Memory Cache with In-Flight Deduplication (Single-Flight)
 * 
 * Ensures multiple concurrent admins viewing the dashboard share the same query
 * promise and cached results, preventing Turso Rows-Read multiplication.
 */

import { getOperationalRateStatus } from '@/lib/turso-budget';

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

// Retain cache across warm instances in all environments
globalForCache.sharedDashboardCache = cache;
globalForCache.inflightPromises = inflight;

/**
 * Fetch with single-flight request deduplication and in-memory TTL caching.
 * If 6 admins request the dashboard simultaneously, only ONE query executes against Turso.
 * Dynamically extends TTL if the operational 400 Rows-Read/min rate approaches threshold.
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

  // Dynamically adapt TTL based on operational rows-per-minute rate
  const rateStatus = getOperationalRateStatus();
  let effectiveTtl = ttlMs;
  if (rateStatus.rateWarningLevel === 'RATE_100_SATURATED') {
    effectiveTtl = Math.max(ttlMs * 3, 120000); // Saturated: triple TTL to protect Turso
  } else if (rateStatus.rateWarningLevel === 'RATE_90_THROTTLE') {
    effectiveTtl = Math.max(ttlMs * 2, 90000); // 90%: double TTL
  } else if (rateStatus.rateWarningLevel === 'RATE_75_WARNING') {
    effectiveTtl = Math.max(Math.round(ttlMs * 1.5), 60000); // 75%: 1.5x TTL
  }

  const p = (async () => {
    try {
      const data = await fetcher();
      cache.set(key, { data, expiresAt: Date.now() + effectiveTtl });
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
