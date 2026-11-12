import { Router } from 'express'
import { ProfileUpdateBody, type Profile } from '../../shared/schemas/index.js'
import { requireAccount } from '../middleware/requireAccount.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { getProfile, saveProfile } from '../services/profile.js'

export const profileRouter = Router()

profileRouter.get('/', requireAuth, requireAccount, async (req, res) => {
  res.json((await getProfile(userId(req))) satisfies Profile)
})

profileRouter.put(
  '/',
  requireAuth,
  requireAccount,
  validate({ body: ProfileUpdateBody }),
  async (req, res) => {
    res.json((await saveProfile(userId(req), req.body as ProfileUpdateBody)) satisfies Profile)
  },
)
