import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { User } from '../models/User.js'
import { SESSION_COOKIE } from '../services/tokens.js'
import { registeredAgent, testApp, useTestDb } from '../test/setup.js'

useTestDb()

describe('GET /me', () => {
  it('returns the logged-in student only', async () => {
    const app = testApp()
    const { agent, user } = await registeredAgent(app, 'asha@example.com')
    await registeredAgent(app, 'ravi@example.com')

    const res = await agent.get('/api/v1/me')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      user: { id: user.id, email: 'asha@example.com', verified: false },
      profileComplete: 0,
    })
  })

  it('401 when logged out', async () => {
    const res = await request(testApp()).get('/api/v1/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('401 for a forged, expired or alg=none token', async () => {
    const app = testApp()
    const { user } = await registeredAgent(app)
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough!!', { subject: user.id })
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET!, {
      subject: user.id,
    })
    const none = jwt.sign({}, '', { subject: user.id, algorithm: 'none' })

    for (const token of [forged, expired, none, 'garbage']) {
      const res = await request(app).get('/api/v1/me').set('Cookie', `${SESSION_COOKIE}=${token}`)
      expect(res.status).toBe(401)
    }
  })

  it('401 when the account no longer exists', async () => {
    const app = testApp()
    const { agent } = await registeredAgent(app)
    await User.deleteMany({})
    expect((await agent.get('/api/v1/me')).status).toBe(401)
  })
})
