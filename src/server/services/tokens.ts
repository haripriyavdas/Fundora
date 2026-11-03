import { createHash, randomBytes } from 'node:crypto'
import type { CookieOptions } from 'express'
import jwt from 'jsonwebtoken'
import { env, isProd } from '../config/env.js'

export const SESSION_COOKIE = 'fundora_session'
const SESSION_DAYS = 7

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
}

export function signSession(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${SESSION_DAYS}d`,
    algorithm: 'HS256',
  })
}

/** The user id from a valid session token, or null. */
export function verifySession(token: unknown): string | null {
  if (typeof token !== 'string' || !token) return null
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** A random single-use token for email links. Email `token`; store only `hash`. */
export function createOneTimeToken(ttlMs: number) {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) }
}
