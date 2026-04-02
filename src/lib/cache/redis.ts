import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const CACHE_TTL = {
  SEARCH: 300,        // 5 minutes
  RANK_DATA: 1800,    // 30 minutes
  RANKING: 300,       // 5 minutes
  SCHOOL_LIST: 86400, // 24 hours
} as const;

// In-memory cache for the current process (simple Map with TTL)
const memCache = new Map<string, { data: unknown; expiresAt: number }>();

export async function getCached<T>(key: string): Promise<T | null> {
  const entry = memCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  if (entry) {
    memCache.delete(key);
  }
  return null;
}

export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  memCache.set(key, {
    data,
    expiresAt: Date.now() + ttl * 1000,
  });
}

export async function invalidateCache(pattern: string): Promise<void> {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memCache.keys()) {
    if (regex.test(key)) {
      memCache.delete(key);
    }
  }
}
