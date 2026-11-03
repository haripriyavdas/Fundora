import type { RequestHandler } from 'express'
import { HttpError } from '../lib/httpError.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF defence alongside the SameSite=Lax cookie: state-changing requests that carry a body must
 * be JSON. Cross-site HTML forms can only send form or text bodies, so they are rejected here.
 */
export const requireJson: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()
  const hasBody =
    req.headers['content-type'] !== undefined || Number(req.headers['content-length'] ?? 0) > 0
  if (hasBody && !req.is('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE')
  next()
}
