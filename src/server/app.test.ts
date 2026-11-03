import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { registeredAgent, testApp, useTestDb } from './test/setup.js'

useTestDb()

describe('app', () => {
  it('GET /api/v1/health reports the database', async () => {
    const res = await request(testApp()).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, db: 'up' })
  })

  it('unknown API paths return a JSON 404', async () => {
    const res = await request(testApp()).get('/api/v1/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  // Students are the only users: guard against anyone adding admin routes by accident
  it.each(['/api/v1/admin', '/api/v1/admin/users', '/api/admin'])(
    'no admin route at %s, even when logged in',
    async (path) => {
      const app = testApp()
      const { agent } = await registeredAgent(app)
      for (const method of ['get', 'post'] as const) {
        const res = await agent[method](path)
        expect(res.status).toBe(404)
      }
    },
  )

  it('sets security headers and hides Express', async () => {
    const res = await request(testApp()).get('/api/v1/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('rejects bodies over 100kb', async () => {
    const res = await request(testApp())
      .post('/api/v1/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(110_000) })
    expect(res.status).toBe(413)
  })
})
