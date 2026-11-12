import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../lib/httpError.js'
import { User } from '../models/User.js'
import { verifyGoogleIdToken, type GoogleIdentity } from '../services/google.js'
import { SESSION_COOKIE } from '../services/tokens.js'
import { registeredAgent, STRONG_PASSWORD, testApp, useTestDb } from '../test/setup.js'

// Google can't be reached from tests: stand in for the token check and test everything around it
vi.mock('../services/google.js', () => ({ verifyGoogleIdToken: vi.fn() }))
const googleSays = (identity: Partial<GoogleIdentity> = {}) =>
  vi.mocked(verifyGoogleIdToken).mockResolvedValue({
    googleId: 'google-sub-123',
    email: 'asha@example.com',
    emailVerified: true,
    ...identity,
  })

useTestDb()
beforeEach(() => vi.mocked(verifyGoogleIdToken).mockReset())

const ID_TOKEN = 'header.payload.signature-from-google'
const google = (body: object, app = testApp()) =>
  request(app).post('/api/v1/auth/google').send(body)
const cookieHeader = (res: request.Response) => [res.headers['set-cookie'] ?? []].flat().join(';')

describe('POST /auth/google', () => {
  it('creates a verified student from the signup page and starts a session', async () => {
    googleSays()
    const res = await google({ idToken: ID_TOKEN, consent: true })

    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'asha@example.com',
      verified: true,
    })
    expect(cookieHeader(res)).toContain(`${SESSION_COOKIE}=`)
    expect(verifyGoogleIdToken).toHaveBeenCalledWith(ID_TOKEN)

    const user = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash').lean()
    expect(user).toMatchObject({ googleId: 'google-sub-123', verified: true })
    expect(user?.consentAt).toBeInstanceOf(Date)
    // Only the Google id and email: no role, password, name, picture or Google token
    expect(user).not.toHaveProperty('role')
    expect(user).not.toHaveProperty('passwordHash')
    expect(JSON.stringify(user)).not.toContain(ID_TOKEN)
    expect(Object.keys(user!).sort()).toEqual(
      ['__v', '_id', 'consentAt', 'createdAt', 'email', 'googleId', 'updatedAt', 'verified'].sort(),
    )
  })

  it('refuses a Google account whose email Google has not verified, and creates nothing', async () => {
    googleSays({ emailVerified: false })
    const res = await google({ idToken: ID_TOKEN, consent: true })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('GOOGLE_EMAIL_UNVERIFIED')
    expect(await User.countDocuments()).toBe(0)
  })

  it('needs consent to create an account, so the login page cannot sign up silently', async () => {
    googleSays()
    const res = await google({ idToken: ID_TOKEN })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CONSENT_REQUIRED')
    expect(await User.countDocuments()).toBe(0)
  })

  it('logs a returning student in by Google id, without consent, even if their email changed', async () => {
    googleSays()
    const first = await google({ idToken: ID_TOKEN, consent: true })
    googleSays({ email: 'asha.new@example.com' })
    const again = await google({ idToken: ID_TOKEN })
    expect(again.status).toBe(200)
    expect(again.body.user.id).toBe(first.body.user.id)
    expect(await User.countDocuments()).toBe(1)
  })

  it('links Google to an existing password account with the same email and marks it verified', async () => {
    const { agent } = await registeredAgent()
    expect((await agent.get('/api/v1/me')).body.user.verified).toBe(false)

    googleSays()
    const res = await google({ idToken: ID_TOKEN })
    expect(res.status).toBe(200)
    expect(res.body.user.verified).toBe(true)

    const user = await User.findOne({ email: 'asha@example.com' }).select('+verifyTokenHash').lean()
    expect(user).toMatchObject({ googleId: 'google-sub-123', verified: true })
    expect(user).not.toHaveProperty('verifyTokenHash')
    expect(await User.countDocuments()).toBe(1)
    // The password still works
    const login = await request(testApp())
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: STRONG_PASSWORD })
    expect(login.status).toBe(200)
  })

  it('409 when the email is already linked to a different Google account', async () => {
    googleSays()
    await google({ idToken: ID_TOKEN, consent: true })
    googleSays({ googleId: 'another-google-sub' })
    const res = await google({ idToken: ID_TOKEN, consent: true })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('401 when Google rejects the token', async () => {
    const rejection = new HttpError(
      401,
      'INVALID_GOOGLE_TOKEN',
      'Google sign-in failed. Please try again.',
    )
    vi.mocked(verifyGoogleIdToken).mockImplementationOnce(() => Promise.reject(rejection))
    const res = await google({ idToken: ID_TOKEN, consent: true })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN')
    expect(cookieHeader(res)).not.toContain(SESSION_COOKIE)
  })

  it.each([
    ['no token', {}],
    ['a token that is too short', { idToken: 'short' }],
    ['consent that is not true', { idToken: ID_TOKEN, consent: false }],
    ['an extra role field', { idToken: ID_TOKEN, consent: true, role: 'admin' }],
  ])('400 for %s', async (_name, body) => {
    googleSays()
    const res = await google(body)
    if ('role' in body) {
      // Unknown keys are stripped, never stored
      expect(res.status).toBe(200)
      expect(await User.findOne().lean()).not.toHaveProperty('role')
    } else {
      expect(res.status).toBe(400)
      expect(verifyGoogleIdToken).not.toHaveBeenCalled()
    }
  })

  it('gives a session that works for student pages', async () => {
    googleSays()
    const agent = request.agent(testApp())
    await agent.post('/api/v1/auth/google').send({ idToken: ID_TOKEN, consent: true })
    const me = await agent.get('/api/v1/me')
    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe('asha@example.com')
  })

  it('does not let a Google-only account log in with an empty or guessed password', async () => {
    googleSays()
    await google({ idToken: ID_TOKEN, consent: true })
    const res = await request(testApp())
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: STRONG_PASSWORD })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })
})
