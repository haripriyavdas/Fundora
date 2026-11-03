import { Router } from 'express'
import type { MeResponse } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { toPublicUser, User } from '../models/User.js'

export const meRouter = Router()

meRouter.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(userId(req))
  // A valid cookie for a deleted account is treated as logged out
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED')
  // Profiles arrive in Phase 2; until then completeness is 0
  res.json({ user: toPublicUser(user), profileComplete: 0 } satisfies MeResponse)
})
