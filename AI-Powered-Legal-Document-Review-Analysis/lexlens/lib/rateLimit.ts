const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; resetAt?: number } {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour in ms
  const limit = 5;

  // Memory Leak Prevention: Cleanup expired entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }

  // Handle fallback to isolate individual clients if IP is unknown (e.g. localhost testing)
  const clientKey = ip === "unknown" ? `unknown_${Math.random().toString(36).substring(2, 9)}` : ip;

  const entry = rateLimitMap.get(clientKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientKey, { count: 1, resetAt: now + window });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true };
}
