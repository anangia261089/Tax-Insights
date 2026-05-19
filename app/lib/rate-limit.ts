// Sliding-window rate limiter. In-process only — sufficient for a single-instance
// deployment. Replace the store with Redis (e.g. Upstash) for multi-instance scale.

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;   // per key per window

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    store.set(key, entry);
    return { allowed: false, retryAfterMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}
