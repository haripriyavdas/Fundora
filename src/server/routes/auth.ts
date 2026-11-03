import { Router, type Response } from 'express'
import {
  ForgotBody,
  LoginBody,
  RegisterBody,
  ResetBody,
  TokenBody,
  type UserResponse,
} from '../../shared/schemas/index.js'
import { requireAuth, userId } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { toPublicUser, type UserDoc } from '../models/User.js'
import {
  loginStudent,
  registerStudent,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmailToken,
} from '../services/auth.js'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '../services/tokens.js'

export const authRouter = Router()

function startSession(res: Response, user: UserDoc) {
  res.cookie(SESSION_COOKIE, signSession(user.id), sessionCookieOptions)
}

authRouter.post('/register', validate({ body: RegisterBody }), async (req, res) => {
  const user = await registerStudent(req.body as RegisterBody)
  // Logged in straight away: unverified students can build a profile (docs/backend.md)
  startSession(res, user)
  res.status(201).json({ user: toPublicUser(user) } satisfies UserResponse)
})

authRouter.post('/verify', validate({ body: TokenBody }), async (req, res) => {
  const user = await verifyEmailToken((req.body as TokenBody).token)
  res.json({ user: toPublicUser(user) } satisfies UserResponse)
})

authRouter.post('/resend-verification', requireAuth, async (req, res) => {
  await resendVerification(userId(req))
  res.status(204).end()
})

authRouter.post('/login', validate({ body: LoginBody }), async (req, res) => {
  const user = await loginStudent(req.body as LoginBody)
  startSession(res, user)
  res.json({ user: toPublicUser(user) } satisfies UserResponse)
})

authRouter.post('/logout', requireAuth, (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = sessionCookieOptions
  res.clearCookie(SESSION_COOKIE, clearOptions)
  res.status(204).end()
})

authRouter.post('/forgot', validate({ body: ForgotBody }), async (req, res) => {
  await requestPasswordReset((req.body as ForgotBody).email)
  res.json({ ok: true })
})

authRouter.post('/reset', validate({ body: ResetBody }), async (req, res) => {
  await resetPassword(req.body as ResetBody)
  res.status(204).end()
})
