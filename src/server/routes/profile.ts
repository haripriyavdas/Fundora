import { Router, type RequestHandler } from 'express'
import { ProfileUpdateBody, type Profile } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { User } from '../models/User.js'
import { getProfile, saveProfile } from '../services/profile.js'

export const profileRouter = Router()

// A cookie can outlive its account. Without this check, a save would recreate a deleted
// student's data, because the save is an upsert.
const requireAccount: RequestHandler = async (req, _res, next) => {
  if (!(await User.exists({ _id: userId(req) }))) throw new HttpError(401, 'UNAUTHENTICATED')
  next()
}

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
