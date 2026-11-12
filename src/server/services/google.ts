import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'
import { HttpError } from '../lib/httpError.js'

export type GoogleIdentity = { googleId: string; email: string; emailVerified: boolean }

let client: OAuth2Client | undefined

/**
 * Checks a Google ID token's signature, expiry, issuer and audience (our client ID) with Google's
 * public keys, and returns who it belongs to. The token itself is never stored or logged.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(503, 'GOOGLE_DISABLED', 'Google sign-in is not available right now.')
  }
  client ??= new OAuth2Client()
  let payload
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    payload = ticket.getPayload()
  } catch {
    payload = undefined
  }
  if (!payload?.sub || !payload.email) {
    throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google sign-in failed. Please try again.')
  }
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
  }
}
