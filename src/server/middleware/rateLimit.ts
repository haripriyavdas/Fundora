import { rateLimit } from 'express-rate-limit'
import { HttpError } from '../lib/httpError.js'

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new HttpError(429, 'RATE_LIMITED')),
  })

export type RateLimits = { auth: number; global: number }

export const DEFAULT_RATE_LIMITS: RateLimits = { auth: 10, global: 100 }

/** Per-IP limiters (docs/backend.md). Created per app so tests get a fresh counter. */
export function createRateLimiters(limits: RateLimits = DEFAULT_RATE_LIMITS) {
  return { auth: limiter(limits.auth), global: limiter(limits.global) }
}
