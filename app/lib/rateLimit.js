/**
 * Shammah Unified Server Rate Limiter
 * Token-bucket rate limiter with PostgreSQL persistence via RPC
 * and in-memory sliding window fallback.
 */

import { createClient } from '@supabase/supabase-js';

const memStore = new Map();
const MEM_MAX_ENTRIES = 2000;

function checkInMemoryRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = memStore.get(key) || { timestamps: [] };
  const validTimestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    memStore.set(key, { timestamps: validTimestamps });
    return { allowed: false, remaining: 0, resetInSeconds: Math.ceil((validTimestamps[0] + windowMs - now) / 1000) };
  }

  validTimestamps.push(now);
  memStore.set(key, { timestamps: validTimestamps });

  // Garbage collect memory store
  if (memStore.size > MEM_MAX_ENTRIES) {
    for (const [k, v] of memStore.entries()) {
      const active = v.timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) memStore.delete(k);
      else memStore.set(k, { timestamps: active });
    }
  }

  return { allowed: true, remaining: maxRequests - validTimestamps.length };
}

/**
 * Checks if a given action key is rate limited.
 * 
 * @param {string} key Identifier (e.g., `ip:${clientIp}:action` or `user:${userId}:action`)
 * @param {Object} options
 * @param {number} [options.max=10] Max requests per window
 * @param {number} [options.windowSeconds=60] Window duration in seconds
 * @returns {Promise<{ allowed: boolean, remaining?: number, resetInSeconds?: number }>}
 */
export async function checkRateLimit(key, { max = 10, windowSeconds = 60 } = {}) {
  if (!key) return { allowed: true, remaining: max };

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (rawUrl && serviceKey && !rawUrl.includes('placeholder')) {
    try {
      const supabase = createClient(rawUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const refillRate = Number((max / windowSeconds).toFixed(2));
      const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_cost: 1,
        p_max_tokens: max,
        p_refill_rate: refillRate,
      });

      if (!error && typeof allowed === 'boolean') {
        return { allowed };
      }
    } catch {
      // Fall through to in-memory check
    }
  }

  return checkInMemoryRateLimit(key, max, windowSeconds * 1000);
}
