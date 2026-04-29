/**
 * Lightweight in-memory rate limiter (best-effort, per server instance).
 *
 * This is not globally consistent across serverless instances, but it
 * meaningfully raises the abuse cost and protects against accidental bursts.
 * For strict global limits use Redis/Upstash later.
 */

const buckets = new Map();

function nowMs() {
  return Date.now();
}

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function envLimit(name, fallback) {
  return parsePositiveInt(process.env[name], fallback);
}

export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim();
  if (ip) return ip;
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * @param {{ key: string, limit: number, windowMs: number }} args
 * @returns {{ allowed: boolean, retryAfterSec: number, remaining: number }}
 */
export function takeRateLimit({ key, limit, windowMs }) {
  const t = nowMs();
  const rec = buckets.get(key);
  if (!rec || t >= rec.resetAt) {
    buckets.set(key, { count: 1, resetAt: t + windowMs });
    return {
      allowed: true,
      retryAfterSec: Math.ceil(windowMs / 1000),
      remaining: Math.max(0, limit - 1),
    };
  }
  if (rec.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - t) / 1000)),
      remaining: 0,
    };
  }
  rec.count += 1;
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((rec.resetAt - t) / 1000)),
    remaining: Math.max(0, limit - rec.count),
  };
}

export function rateLimitHeaders(meta) {
  return {
    "Retry-After": String(meta.retryAfterSec),
    "X-RateLimit-Remaining": String(meta.remaining),
  };
}

