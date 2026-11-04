import { Router } from 'express'
import { profileCompleteness } from '../../shared/profileCompleteness.js'
import type { MeResponse } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { toPublicUser, User } from '../models/User.js'
import { getProfile } from '../services/profile.js'

export const meRouter = Router()

meRouter.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(userId(req))
  // A valid cookie for a deleted account is treated as logged out
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED')
  const profileComplete = profileCompleteness(await getProfile(user.id))
  res.json({ user: toPublicUser(user), profileComplete } satisfies MeResponse)
})
