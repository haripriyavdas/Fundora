import bcrypt from 'bcrypt'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { User } from '../models/User.js'
import { outbox } from '../services/email.js'
import { hashToken, SESSION_COOKIE } from '../services/tokens.js'
import {
  registeredAgent,
  STRONG_PASSWORD,
  testApp,
  tokenFromEmail,
  useTestDb,
} from '../test/setup.js'

useTestDb()

const cookieHeader = (res: request.Response) => [res.headers['set-cookie'] ?? []].flat().join(';')

describe('POST /auth/register', () => {
  it('creates an unverified student, starts a session and emails a verification link', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/register')
      .send({ email: '  Asha@Example.com ', password: STRONG_PASSWORD, consent: true })

    expect(res.status).toBe(201)
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'asha@example.com',
      verified: false,
    })
    const cookie = cookieHeader(res)
    expect(cookie).toContain(`${SESSION_COOKIE}=`)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)

    const user = await User.findOne({ email: 'asha@example.com' }).select(
      '+passwordHash +verifyTokenHash',
    )
    expect(user?.consentAt).toBeInstanceOf(Date)
    expect(user?.passwordHash).not.toBe(STRONG_PASSWORD)
    expect(await bcrypt.compare(STRONG_PASSWORD, user!.passwordHash!)).toBe(true)
    expect(user?.toObject()).not.toHaveProperty('role')

    expect(outbox).toHaveLength(1)
    expect(outbox[0].to).toBe('asha@example.com')
    expect(outbox[0].text).toContain('http://localhost:3000/verify-email?token=')
    expect(outbox[0].text).toContain('never asks for passwords or OTPs')
    // Only the hash of the emailed token is stored
    expect(user?.verifyTokenHash).toBe(hashToken(tokenFromEmail('asha@example.com')))
  })

  it('never returns the password hash', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/register')
      .send({ email: 'asha@example.com', password: STRONG_PASSWORD, consent: true })
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/)
  })

  it.each([
    ['bad email', { email: 'not-an-email', password: STRONG_PASSWORD, consent: true }, 'email'],
    ['short password', { email: 'a@example.com', password: 'short1', consent: true }, 'password'],
    [
      'common password',
      { email: 'a@example.com', password: 'Password123', consent: true },
      'password',
    ],
    [
      'password over 72 bytes',
      { email: 'a@example.com', password: 'x'.repeat(73), consent: true },
      'password',
    ],
    [
      'no consent',
      { email: 'a@example.com', password: STRONG_PASSWORD, consent: false },
      'consent',
    ],
    ['missing consent', { email: 'a@example.com', password: STRONG_PASSWORD }, 'consent'],
  ])('400 on %s', async (_name, body, field) => {
    const res = await request(testApp()).post('/api/v1/auth/register').send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
    expect(res.body.error.fields).toHaveProperty(field)
    expect(await User.countDocuments()).toBe(0)
  })

  it('ignores extra fields such as a role', async () => {
    const res = await request(testApp()).post('/api/v1/auth/register').send({
      email: 'asha@example.com',
      password: STRONG_PASSWORD,
      consent: true,
      role: 'admin',
      verified: true,
    })
    expect(res.status).toBe(201)
    expect(res.body.user.verified).toBe(false)
    const raw = await User.collection.findOne({ email: 'asha@example.com' })
    expect(raw).not.toHaveProperty('role')
  })

  it('409 when the email is already registered', async () => {
    const app = testApp()
    await registeredAgent(app)
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'ASHA@example.com', password: STRONG_PASSWORD, consent: true })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  it('415 for a non-JSON body (blocks cross-site form posts)', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/register')
      .type('form')
      .send(`email=asha@example.com&password=${STRONG_PASSWORD}&consent=true`)
    expect(res.status).toBe(415)
  })

  it('400 for malformed JSON without leaking parser details', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: { code: 'INVALID_JSON', message: expect.any(String) } })
  })
})

describe('POST /auth/verify', () => {
  it('verifies the email once', async () => {
    const app = testApp()
    await registeredAgent(app)
    const token = tokenFromEmail('asha@example.com')

    const res = await request(app).post('/api/v1/auth/verify').send({ token })
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: 'asha@example.com', verified: true })

    const again = await request(app).post('/api/v1/auth/verify').send({ token })
    expect(again.status).toBe(400)
    expect(again.body.error.code).toBe('INVALID_TOKEN')
  })

  it('400 for an expired token', async () => {
    const app = testApp()
    await registeredAgent(app)
    const token = tokenFromEmail('asha@example.com')
    await User.updateOne({}, { $set: { verifyTokenExpiresAt: new Date(Date.now() - 1000) } })

    const res = await request(app).post('/api/v1/auth/verify').send({ token })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })

  it('400 for a malformed or unknown token', async () => {
    const app = testApp()
    expect((await request(app).post('/api/v1/auth/verify').send({ token: 'abc' })).status).toBe(400)
    expect(
      (
        await request(app)
          .post('/api/v1/auth/verify')
          .send({ token: { $ne: null } })
      ).status,
    ).toBe(400)
    const unknown = 'A'.repeat(43)
    const res = await request(app).post('/api/v1/auth/verify').send({ token: unknown })
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })
})

describe('POST /auth/resend-verification', () => {
  it('sends a new link and invalidates the old one', async () => {
    const app = testApp()
    const { agent } = await registeredAgent(app)
    const oldToken = tokenFromEmail('asha@example.com')

    const res = await agent.post('/api/v1/auth/resend-verification')
    expect(res.status).toBe(204)
    expect(outbox).toHaveLength(2)
    const newToken = tokenFromEmail('asha@example.com')
    expect(newToken).not.toBe(oldToken)

    expect((await request(app).post('/api/v1/auth/verify').send({ token: oldToken })).status).toBe(
      400,
    )
    expect((await request(app).post('/api/v1/auth/verify').send({ token: newToken })).status).toBe(
      200,
    )
  })

  it('does nothing for an already verified student', async () => {
    const app = testApp()
    const { agent } = await registeredAgent(app)
    await request(app)
      .post('/api/v1/auth/verify')
      .send({ token: tokenFromEmail('asha@example.com') })

    expect((await agent.post('/api/v1/auth/resend-verification')).status).toBe(204)
    expect(outbox).toHaveLength(1)
  })

  it('401 when logged out', async () => {
    const res = await request(testApp()).post('/api/v1/auth/resend-verification')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })
})

describe('POST /auth/login', () => {
  it('logs in with the right password and sets the session cookie', async () => {
    const app = testApp()
    await registeredAgent(app)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'Asha@example.com', password: STRONG_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: 'asha@example.com', verified: false })
    expect(cookieHeader(res)).toContain(`${SESSION_COOKIE}=`)
  })

  it('401 with the same message for a wrong password and an unknown email', async () => {
    const app = testApp()
    await registeredAgent(app)
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: 'nope-nope' })
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ravi@example.com', password: 'nope-nope' })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.body).toEqual(unknown.body)
    expect(cookieHeader(wrong)).not.toContain(SESSION_COOKIE)
  })

  it('401 for a Google-only account with no password', async () => {
    await User.create({
      email: 'g@example.com',
      googleId: 'g-123',
      verified: true,
      consentAt: new Date(),
    })
    const res = await request(testApp())
      .post('/api/v1/auth/login')
      .send({ email: 'g@example.com', password: 'anything1' })
    expect(res.status).toBe(401)
  })

  it('400 on a bad body, including operator injection', async () => {
    const app = testApp()
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email: 'asha@example.com' })).status,
    ).toBe(400)
    const injected = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: STRONG_PASSWORD })
    expect(injected.status).toBe(400)
  })

  it('429 after 10 auth requests a minute from one IP', async () => {
    const app = testApp({ auth: 10, global: 1000 })
    const body = { email: 'asha@example.com', password: 'wrong-pass' }
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/api/v1/auth/login').send(body)).status).toBe(401)
    }
    const res = await request(app).post('/api/v1/auth/login').send(body)
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})

describe('POST /auth/logout', () => {
  it('clears the session cookie', async () => {
    const app = testApp()
    const { agent } = await registeredAgent(app)
    expect((await agent.get('/api/v1/me')).status).toBe(200)

    const res = await agent.post('/api/v1/auth/logout')
    expect(res.status).toBe(204)
    expect(cookieHeader(res)).toMatch(new RegExp(`${SESSION_COOKIE}=;`))
    expect((await agent.get('/api/v1/me')).status).toBe(401)
  })

  it('401 when logged out', async () => {
    expect((await request(testApp()).post('/api/v1/auth/logout')).status).toBe(401)
  })
})

describe('POST /auth/forgot and /auth/reset', () => {
  it('200 for unknown emails too, without sending anything', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/forgot')
      .send({ email: 'nobody@example.com' })
    expect(res.status).toBe(200)
    expect(outbox).toHaveLength(0)
  })

  it('400 for a bad email', async () => {
    expect((await request(testApp()).post('/api/v1/auth/forgot').send({ email: 'x' })).status).toBe(
      400,
    )
  })

  it('resets the password with the emailed token, once', async () => {
    const app = testApp()
    await registeredAgent(app)
    const forgot = await request(app)
      .post('/api/v1/auth/forgot')
      .send({ email: 'ASHA@example.com' })
    expect(forgot.status).toBe(200)
    const resetEmail = outbox.at(-1)!
    expect(resetEmail.subject).toMatch(/reset/i)
    expect(resetEmail.text).toContain('http://localhost:3000/reset-password?token=')
    const token = tokenFromEmail('asha@example.com')

    const reset = await request(app)
      .post('/api/v1/auth/reset')
      .send({ token, password: 'new-mango-77' })
    expect(reset.status).toBe(204)

    const reuse = await request(app)
      .post('/api/v1/auth/reset')
      .send({ token, password: 'other-mango-88' })
    expect(reuse.status).toBe(400)
    expect(reuse.body.error.code).toBe('INVALID_TOKEN')

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: STRONG_PASSWORD })
    expect(oldLogin.status).toBe(401)
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@example.com', password: 'new-mango-77' })
    expect(newLogin.status).toBe(200)
    // Following the emailed link proves the address
    expect(newLogin.body.user.verified).toBe(true)
  })

  it('400 for an expired reset token', async () => {
    const app = testApp()
    await registeredAgent(app)
    await request(app).post('/api/v1/auth/forgot').send({ email: 'asha@example.com' })
    const token = tokenFromEmail('asha@example.com')
    await User.updateOne({}, { $set: { resetTokenExpiresAt: new Date(Date.now() - 1000) } })

    const res = await request(app)
      .post('/api/v1/auth/reset')
      .send({ token, password: 'new-mango-77' })
    expect(res.status).toBe(400)
  })

  it('400 for a weak new password', async () => {
    const app = testApp()
    await registeredAgent(app)
    await request(app).post('/api/v1/auth/forgot').send({ email: 'asha@example.com' })
    const token = tokenFromEmail('asha@example.com')
    const res = await request(app).post('/api/v1/auth/reset').send({ token, password: '12345678' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toHaveProperty('password')
  })
})
