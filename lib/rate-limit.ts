import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let checksSinceSweep = 0;

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Best-effort, in-memory fixed-window rate limit. On Vercel's serverless
 * runtime this resets per cold start and isn't shared across instances, so
 * it only slows down abuse hitting one warm instance — not a distributed
 * attack. Pair with Vercel's dashboard-level Firewall rate-limiting rules
 * (no code change, configured per-project) for real protection.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Bound memory growth from one-off callers by sweeping periodically
  // instead of on every call.
  checksSinceSweep += 1;
  if (checksSinceSweep >= 500) {
    checksSinceSweep = 0;
    sweepExpired(now);
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/** Best-effort client IP from the standard proxy header Vercel sets. */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
