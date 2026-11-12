import { z } from 'zod'
import { COMMON_PASSWORDS } from '../commonPasswords.js'

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }).max(254))

/** Password rules for new passwords (register, reset). bcrypt only reads the first 72 bytes. */
export const NewPasswordSchema = z
  .string()
  .min(8, { error: 'Use at least 8 characters.' })
  .refine((p) => new TextEncoder().encode(p).length <= 72, { error: 'Use at most 72 characters.' })
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), {
    error: 'This password is too common. Pick something harder to guess.',
  })

export const RegisterBody = z.object({
  email: EmailSchema,
  password: NewPasswordSchema,
  consent: z.literal(true, { error: 'Please accept the privacy notice to continue.' }),
})

export const LoginBody = z.object({
  email: EmailSchema,
  password: z.string().min(1, { error: 'Enter your password.' }).max(200),
})

// One-time tokens are 32 random bytes, base64url → 43 characters
export const TokenBody = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, { error: 'This link is not valid.' }),
})

export const ForgotBody = z.object({ email: EmailSchema })

export const ResetBody = TokenBody.extend({ password: NewPasswordSchema })

/**
 * Google sign-in: the ID token from Google's button. `consent` is required only when this
 * creates a new account, so the signup page sends it and the login page doesn't.
 */
export const GoogleAuthBody = z.object({
  idToken: z.string().min(20).max(4096),
  consent: z.literal(true).optional(),
})

export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  verified: z.boolean(),
})

export const UserResponse = z.object({ user: PublicUserSchema })

export const MeResponse = z.object({
  user: PublicUserSchema,
  /** 0–100; percentage of profile fields filled (0 until the profile exists) */
  profileComplete: z.number().int().min(0).max(100),
})

export type RegisterBody = z.infer<typeof RegisterBody>
export type LoginBody = z.infer<typeof LoginBody>
export type TokenBody = z.infer<typeof TokenBody>
export type ForgotBody = z.infer<typeof ForgotBody>
export type ResetBody = z.infer<typeof ResetBody>
export type GoogleAuthBody = z.infer<typeof GoogleAuthBody>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type UserResponse = z.infer<typeof UserResponse>
export type MeResponse = z.infer<typeof MeResponse>
