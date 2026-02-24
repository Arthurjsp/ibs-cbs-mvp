interface RateLimitState {
  count: number;
  resetAt: number;
}

interface EnforceRateLimitParams {
  key: string;
  windowMs: number;
  max: number;
  nowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

const state = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

function cleanupExpired(currentNow: number) {
  for (const [key, value] of state.entries()) {
    if (value.resetAt <= currentNow) {
      state.delete(key);
    }
  }
}

export function enforceRateLimit(params: EnforceRateLimitParams): RateLimitResult {
  const currentNow = params.nowMs ?? nowMs();
  cleanupExpired(currentNow);

  const current = state.get(params.key);
  if (!current || current.resetAt <= currentNow) {
    state.set(params.key, {
      count: 1,
      resetAt: currentNow + params.windowMs
    });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(params.max - 1, 0)
    };
  }

  if (current.count >= params.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - currentNow) / 1000), 1),
      remaining: 0
    };
  }

  current.count += 1;
  state.set(params.key, current);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(params.max - current.count, 0)
  };
}

function extractIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown-ip";
}

export function buildRateLimitKey(params: {
  request: Request;
  tenantId: string;
  userId?: string | null;
  route: string;
}) {
  const ip = extractIp(params.request);
  return [params.route, params.tenantId, params.userId ?? "anon", ip].join(":");
}

// Exposed only for tests.
export function __clearRateLimitState() {
  state.clear();
}
