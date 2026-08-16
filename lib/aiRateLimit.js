import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { checkAll, consume } from './rateLimit.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

const readLimit = (name, fallback) => {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const PER_IP_HOURLY = readLimit('AI_RATE_LIMIT_PER_HOUR', 10);
export const PER_IP_DAILY = readLimit('AI_RATE_LIMIT_PER_DAY', 40);
export const GLOBAL_DAILY = readLimit('AI_GLOBAL_LIMIT_PER_DAY', 500);
// This is a hard ceiling on paid upstream attempts. Set it to the number of
// requests that fit inside the provider's monthly dollar budget at MAX_TOKENS.
export const MONTHLY_ATTEMPTS = readLimit('AI_MONTHLY_LIMIT', 500);

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const isProduction = process.env.NODE_ENV === 'production';

let durableLimiters;
let durableError;

function getDurableLimiters() {
  if (durableLimiters || durableError) return durableLimiters;
  if (!redisUrl || !redisToken) return null;

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken, enableTelemetry: false });
    const makeLimiter = (limit, duration, prefix) => new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, duration),
      analytics: false,
      ephemeralCache: false,
      prefix: `tikz:${prefix}`,
      timeout: 1500,
    });
    durableLimiters = {
      ipHour: makeLimiter(PER_IP_HOURLY, '1 h', 'ai-ip-hour'),
      ipDay: makeLimiter(PER_IP_DAILY, '1 d', 'ai-ip-day'),
      globalDay: makeLimiter(GLOBAL_DAILY, '1 d', 'ai-global-day'),
      monthly: makeLimiter(MONTHLY_ATTEMPTS, '30 d', 'ai-monthly'),
    };
    return durableLimiters;
  } catch (error) {
    durableError = error;
    return null;
  }
}

function retryAfter(reset) {
  return Math.max(1, Math.ceil((Number(reset) - Date.now()) / 1000));
}

function denied(message, reset, extra = {}) {
  return {
    allowed: false,
    message,
    retryAfter: retryAfter(reset),
    ...extra,
  };
}

async function durableCheck(limiter, identifier, message) {
  const result = await limiter.limit(identifier);
  if (!result.success) return denied(message, result.reset);
  return { allowed: true };
}

/**
 * Check the visitor-facing request windows before parsing or calling upstream.
 * Production fails closed when the shared limiter is not configured or cannot
 * be reached; development keeps the dependency-free in-memory fallback.
 */
export async function checkAiRequest(ip) {
  const limiters = getDurableLimiters();
  if (!limiters) {
    if (isProduction) {
      return {
        allowed: false,
        status: 503,
        configuration: true,
        message: 'AI generation is temporarily disabled until its shared spend controls are configured.',
      };
    }
    return checkAll([
      {
        key: `gen:ip:hour:${ip}`,
        limit: PER_IP_HOURLY,
        windowMs: HOUR_MS,
        message: `Too many AI generations from this address (limit ${PER_IP_HOURLY} per hour).`,
      },
      {
        key: `gen:ip:day:${ip}`,
        limit: PER_IP_DAILY,
        windowMs: DAY_MS,
        message: `Daily AI generation limit reached for this address (${PER_IP_DAILY} per day).`,
      },
      {
        key: 'gen:global:day',
        limit: GLOBAL_DAILY,
        windowMs: DAY_MS,
        message: 'This demo has hit its shared daily AI budget. Please try again tomorrow.',
      },
    ]);
  }

  try {
    const checks = [
      [limiters.ipHour, `ip:${ip}`, `Too many AI generations from this address (limit ${PER_IP_HOURLY} per hour).`],
      [limiters.ipDay, `ip:${ip}`, `Daily AI generation limit reached for this address (${PER_IP_DAILY} per day).`],
      [limiters.globalDay, 'all', 'This demo has hit its shared daily AI budget. Please try again tomorrow.'],
    ];
    for (const [limiter, identifier, message] of checks) {
      const result = await durableCheck(limiter, identifier, message);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  } catch (error) {
    durableError = error;
    return {
      allowed: false,
      status: 503,
      unavailable: true,
      message: 'AI generation is temporarily unavailable because its shared spend controls could not be reached.',
    };
  }
}

/** Consume one monthly slot immediately before every paid upstream attempt. */
export async function checkAiAttempt() {
  const limiters = getDurableLimiters();
  if (!limiters) {
    if (isProduction) {
      return {
        allowed: false,
        status: 503,
        configuration: true,
        message: 'AI generation is temporarily disabled until its shared spend controls are configured.',
      };
    }
    const result = consume('gen:global:month', MONTHLY_ATTEMPTS, MONTH_MS);
    return result.allowed
      ? { allowed: true }
      : denied(`The monthly AI generation budget is exhausted (${MONTHLY_ATTEMPTS} attempts).`, result.resetAt);
  }

  try {
    return await durableCheck(
      limiters.monthly,
      'all',
      `The monthly AI generation budget is exhausted (${MONTHLY_ATTEMPTS} attempts).`,
    );
  } catch (error) {
    durableError = error;
    return {
      allowed: false,
      status: 503,
      unavailable: true,
      message: 'AI generation is temporarily unavailable because its shared spend controls could not be reached.',
    };
  }
}

export function hasDurableConfig() {
  return Boolean(redisUrl && redisToken);
}

export function durableFailure() {
  return durableError;
}
