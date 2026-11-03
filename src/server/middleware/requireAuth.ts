import type { RequestHandler } from 'express'
import { HttpError } from '../lib/httpError.js'
import { SESSION_COOKIE, verifySession } from '../services/tokens.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string }
    }
  }
}

/** The only access check in Fundora: is this a logged-in student? Sets `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = verifySession(req.cookies?.[SESSION_COOKIE])
  if (!userId) throw new HttpError(401, 'UNAUTHENTICATED')
  req.user = { id: userId }
  next()
}

/** For routes behind requireAuth: the session user's id. */
export function userId(req: Express.Request): string {
  if (!req.user) throw new HttpError(401, 'UNAUTHENTICATED')
  return req.user.id
}
