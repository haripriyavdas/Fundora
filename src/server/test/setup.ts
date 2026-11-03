import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import { createApp } from '../app.js'
import { connectDb } from '../db/connect.js'
import type { RateLimits } from '../middleware/rateLimit.js'
import '../models/User.js'
import { outbox } from '../services/email.js'

// Data files live under node_modules/.cache (the project's drive), not the OS temp folder:
// mongod refuses to start with under 500 MB free, and system drives are often that full.
const TEST_DB_ROOT = join(process.cwd(), 'node_modules', '.cache', 'mongo-test')

/** Starts an in-memory MongoDB for this test file and empties it (and the outbox) before each test. */
export function useTestDb() {
  let mongo: MongoMemoryServer
  let dbPath: string
  beforeAll(async () => {
    mkdirSync(TEST_DB_ROOT, { recursive: true })
    dbPath = mkdtempSync(join(TEST_DB_ROOT, 'db-'))
    mongo = await MongoMemoryServer.create({ instance: { dbPath } })
    await connectDb(mongo.getUri('fundora_test'))
  })
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
    outbox.length = 0
  })
  afterAll(async () => {
    await mongoose.disconnect()
    await mongo?.stop()
    rmSync(dbPath, { recursive: true, force: true })
  })
}

/** High limits so normal tests never hit 429; rate-limit tests pass their own. */
export const testApp = (rateLimits: RateLimits = { auth: 1000, global: 1000 }) =>
  createApp({ rateLimits })

/** Pulls the `token` query value out of the last email sent to `to`. */
export function tokenFromEmail(to: string): string {
  const email = outbox.findLast((e) => e.to === to)
  const match = email && /token=([A-Za-z0-9_-]{43})/.exec(email.text)
  if (!match) throw new Error(`no token email for ${to}`)
  return match[1]
}

export const STRONG_PASSWORD = 'mango-river-42'

/** Registers a student and returns an agent that carries their session cookie. */
export async function registeredAgent(app = testApp(), email = 'asha@example.com') {
  const agent = request.agent(app)
  const res = await agent
    .post('/api/v1/auth/register')
    .send({ email, password: STRONG_PASSWORD, consent: true })
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, user: res.body.user as { id: string; email: string; verified: boolean } }
}
