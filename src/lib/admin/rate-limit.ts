// Basic in-memory login rate limit: 5 failed tries per key (IP + email) in
// 15 minutes. Per process: good enough for one server; swap for a shared store
// (Redis...) when running several instances.
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

type Entry = { failures: number; resetAt: number };
const entries = new Map<string, Entry>();

function live(key: string, now: number): Entry | undefined {
  const entry = entries.get(key);
  if (entry && entry.resetAt <= now) {
    entries.delete(key);
    return undefined;
  }
  return entry;
}

export function loginKey(ip: string, email: string): string {
  return `${ip}|${email.trim().toLowerCase()}`;
}

export function checkLoginRateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const entry = live(key, now);
  if (entry && entry.failures >= LOGIN_MAX_FAILURES) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(key: string, now: number = Date.now()): void {
  const entry = live(key, now);
  if (entry) entry.failures += 1;
  else entries.set(key, { failures: 1, resetAt: now + LOGIN_WINDOW_MS });
  // Keep the map small.
  if (entries.size > 5000) for (const k of entries.keys()) if (!live(k, now)) break;
}

export function clearLoginFailures(key: string): void {
  entries.delete(key);
}

export function resetLoginRateLimits(): void {
  entries.clear();
}
