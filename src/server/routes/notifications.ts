import { Router } from 'express'
import { NotificationSettingsBody, type NotificationSettings } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { requireAccount } from '../middleware/requireAccount.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { User } from '../models/User.js'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth, requireAccount)

const SETTINGS = { deadlineEmails: 1, renewalEmails: 1 } as const

function toSettings(user: { deadlineEmails?: boolean | null; renewalEmails?: boolean | null }) {
  // Missing (older accounts) counts as on
  return {
    deadlineEmails: user.deadlineEmails !== false,
    renewalEmails: user.renewalEmails !== false,
  } satisfies NotificationSettings
}

notificationsRouter.get('/settings', async (req, res) => {
  const user = await User.findById(userId(req), SETTINGS).lean()
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED')
  res.json(toSettings(user))
})

notificationsRouter.patch(
  '/settings',
  validate({ body: NotificationSettingsBody }),
  async (req, res) => {
    const body = req.body as NotificationSettingsBody
    const set: Partial<NotificationSettings> = {}
    if (body.deadlineEmails !== undefined) set.deadlineEmails = body.deadlineEmails
    if (body.renewalEmails !== undefined) set.renewalEmails = body.renewalEmails
    const user = await User.findByIdAndUpdate(
      userId(req),
      { $set: set },
      { new: true, projection: SETTINGS },
    ).lean()
    if (!user) throw new HttpError(401, 'UNAUTHENTICATED')
    res.json(toSettings(user))
  },
)
