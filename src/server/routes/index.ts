import { Router } from 'express'
import { HttpError } from '../lib/httpError.js'
import type { RateLimits } from '../middleware/rateLimit.js'
import { createRateLimiters } from '../middleware/rateLimit.js'
import { requireJson } from '../middleware/requireJson.js'
import { authRouter } from './auth.js'
import { healthRouter } from './health.js'
import { meRouter } from './me.js'
import { notificationsRouter } from './notifications.js'
import { profileRouter } from './profile.js'
import { savedRouter } from './saved.js'
import { schemesRouter } from './schemes.js'

/** Everything under /api/v1. There are no admin or role-based routes, by design. */
export function createApiRouter(rateLimits?: RateLimits) {
  const limiters = createRateLimiters(rateLimits)
  const api = Router()

  api.use('/health', healthRouter)
  api.use(limiters.global)
  api.use(requireJson)

  api.use('/auth', limiters.auth, authRouter)
  api.use('/me', meRouter)
  api.use('/profile', profileRouter)
  api.use('/schemes', schemesRouter)
  api.use('/saved', savedRouter)
  api.use('/notifications', notificationsRouter)

  // Unknown API paths get a JSON 404 instead of the React app
  api.use((_req, _res) => {
    throw new HttpError(404, 'NOT_FOUND')
  })
  return api
}
