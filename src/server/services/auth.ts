import bcrypt from 'bcrypt'
import type { LoginBody, RegisterBody, ResetBody } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { User, type UserDoc } from '../models/User.js'
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js'
import { createOneTimeToken, hashToken, RESET_TOKEN_TTL_MS, VERIFY_TOKEN_TTL_MS } from './tokens.js'

const BCRYPT_COST = 12
// Compared against when the email doesn't exist, so login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('fundora-timing-equaliser', BCRYPT_COST)

const isDuplicateKey = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000

export async function registerStudent({ email, password }: RegisterBody): Promise<UserDoc> {
  if (await User.exists({ email })) {
    throw new HttpError(
      409,
      'EMAIL_TAKEN',
      'An account with this email already exists. Try logging in.',
    )
  }
  const verify = createOneTimeToken(VERIFY_TOKEN_TTL_MS)
  let user: UserDoc
  try {
    user = await User.create({
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      verified: false,
      consentAt: new Date(),
      verifyTokenHash: verify.hash,
      verifyTokenExpiresAt: verify.expiresAt,
    })
  } catch (err) {
    if (isDuplicateKey(err))
      throw new HttpError(
        409,
        'EMAIL_TAKEN',
        'An account with this email already exists. Try logging in.',
      )
    throw err
  }
  await sendVerificationEmail(email, verify.token)
  return user
}

const INVALID_LINK = () =>
  new HttpError(
    400,
    'INVALID_TOKEN',
    'This link is invalid or has expired. Please request a new one.',
  )

export async function verifyEmailToken(token: string): Promise<UserDoc> {
  const user = await User.findOneAndUpdate(
    { verifyTokenHash: hashToken(token), verifyTokenExpiresAt: { $gt: new Date() } },
    { $set: { verified: true }, $unset: { verifyTokenHash: 1, verifyTokenExpiresAt: 1 } },
    { returnDocument: 'after' },
  )
  if (!user) throw INVALID_LINK()
  return user
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await User.findById(userId)
  if (!user) throw new HttpError(401, 'UNAUTHENTICATED')
  if (user.verified) return
  const verify = createOneTimeToken(VERIFY_TOKEN_TTL_MS)
  await User.updateOne(
    { _id: user._id },
    { $set: { verifyTokenHash: verify.hash, verifyTokenExpiresAt: verify.expiresAt } },
  )
  await sendVerificationEmail(user.email, verify.token)
}

export async function loginStudent({ email, password }: LoginBody): Promise<UserDoc> {
  const user = await User.findOne({ email }).select('+passwordHash')
  // Google-only accounts have no password; treat them like a wrong password
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !user.passwordHash || !ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'That email and password don’t match.')
  }
  return user
}

/** Always succeeds from the caller's view, so it never reveals whether an email is registered. */
export async function requestPasswordReset(email: string): Promise<void> {
  const reset = createOneTimeToken(RESET_TOKEN_TTL_MS)
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { resetTokenHash: reset.hash, resetTokenExpiresAt: reset.expiresAt } },
  )
  if (user) await sendPasswordResetEmail(user.email, reset.token)
}

export async function resetPassword({ token, password }: ResetBody): Promise<void> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  // Consuming the token and setting the password is one atomic update, so a token works once.
  // Following the emailed link also proves the student owns the address.
  const user = await User.findOneAndUpdate(
    { resetTokenHash: hashToken(token), resetTokenExpiresAt: { $gt: new Date() } },
    {
      $set: { passwordHash, verified: true },
      $unset: {
        resetTokenHash: 1,
        resetTokenExpiresAt: 1,
        verifyTokenHash: 1,
        verifyTokenExpiresAt: 1,
      },
    },
  )
  if (!user) throw INVALID_LINK()
}
