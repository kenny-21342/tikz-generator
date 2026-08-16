/**
 * Dependency-light, in-memory fixed-window rate limiter.
 *
 * IMPORTANT DEPLOYMENT CAVEAT
 * ---------------------------
 * State lives in a module-level Map, which means it is per-process. On a
 * serverless host (Vercel, Lambda, Cloud Run) that gives you:
 *
 *   - No sharing between concurrent instances. Two visitors routed to two warm
 *     instances each get their own full quota, so the effective ceiling is
 *     (limit x number of live instances), not (limit).
 *   - No persistence across cold starts. An idle instance is reclaimed and its
 *     counters reset to zero.
 *
 * So this is a speed bump against casual abuse and runaway clients, NOT a hard
 * billing guarantee. The real spend ceiling must be set as a hard budget limit
 * in the upstream AI provider's billing console. See README "Rate limiting".
 *
 * To make this durable later, swap `consume()` for an atomic INCR + EXPIRE
 * against Redis/Upstash; the call sites do not need to change.
 */

// key -> { count, resetAt }
const buckets = new Map();

// Bound memory so a flood of distinct keys cannot grow the map without limit.
const MAX_KEYS = 10_000;

function prune(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping expired entries: evict oldest-inserted keys.
  // Map preserves insertion order, so this drops the least recently created.
  if (buckets.size > MAX_KEYS) {
    const excess = buckets.size - MAX_KEYS;
    let i = 0;
    for (const key of buckets.keys()) {
      if (i++ >= excess) break;
      buckets.delete(key);
    }
  }
}

/**
 * Count one hit against `key`. Returns the decision without throwing.
 *
 * @returns {{allowed: boolean, remaining: number, resetAt: number, retryAfter: number}}
 *          `retryAfter` is whole seconds until the window rolls over.
 */
export function consume(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > MAX_KEYS) prune(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt, retryAfter };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter,
  };
}

/**
 * Undo one hit. Used to refund a slot when the request never reached the
 * upstream provider (e.g. it failed validation), so a malformed request does
 * not burn a visitor's quota.
 */
export function refund(key, now = Date.now()) {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt > now && bucket.count > 0) bucket.count -= 1;
}

/**
 * Best-effort client IP.
 *
 * `NextRequest.ip` was removed in Next 15, so this reads the proxy headers the
 * host sets. These headers are client-spoofable when the app is exposed
 * directly, so they are only trustworthy behind a proxy that overwrites them
 * (Vercel and most managed hosts do). Falls back to a single shared bucket
 * rather than to a per-request unique value: an unknown origin should be
 * throttled collectively, never handed an unlimited quota.
 */
export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Left-most entry is the original client; the rest are proxy hops.
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Apply an ordered list of rules, all of which must pass. The first failure
 * decides the response, so put the tightest/most specific rule first.
 *
 * Rules already consumed before a later rule fails are intentionally NOT
 * refunded — a request that trips the daily cap should still count toward the
 * hourly one.
 *
 * @param {Array<{key: string, limit: number, windowMs: number, message: string}>} rules
 * @returns {{allowed: true, keys: string[]} | {allowed: false, retryAfter: number, message: string, keys: string[]}}
 */
export function checkAll(rules, now = Date.now()) {
  const keys = [];
  for (const rule of rules) {
    const result = consume(rule.key, rule.limit, rule.windowMs, now);
    keys.push(rule.key);
    if (!result.allowed) {
      return { allowed: false, retryAfter: result.retryAfter, message: rule.message, keys };
    }
  }
  return { allowed: true, keys };
}

/** Test-only: drop all counters. */
export function __reset() {
  buckets.clear();
}
