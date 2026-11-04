import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { ProfileModel } from '../models/Profile.js'
import { User } from '../models/User.js'
import { decrypt } from '../services/crypto.js'
import { registeredAgent, testApp, useTestDb } from '../test/setup.js'

useTestDb()

const rawProfile = async (userId: string) => {
  const doc = await ProfileModel.collection.findOne({
    userId: new ProfileModel.base.Types.ObjectId(userId),
  })
  if (!doc) throw new Error('no profile stored')
  return doc
}

describe('GET /profile', () => {
  it('returns an empty profile at version 0 before the first save, and stores nothing', async () => {
    const { agent } = await registeredAgent()
    const res = await agent.get('/api/v1/profile')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ profileVersion: 0 })
    expect(await ProfileModel.countDocuments()).toBe(0)
  })

  it('401 when logged out', async () => {
    const res = await request(testApp()).get('/api/v1/profile')
    expect(res.status).toBe(401)
  })
})

describe('PUT /profile', () => {
  it('saves a partial profile and returns it without internal fields', async () => {
    const { agent } = await registeredAgent()
    const res = await agent
      .put('/api/v1/profile')
      .send({ courseCategory: 'engineering', yearOfStudy: 2 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ courseCategory: 'engineering', yearOfStudy: 2, profileVersion: 1 })
  })

  it('stores familyIncome, category and disability encrypted, and returns them decrypted', async () => {
    const { agent, user } = await registeredAgent()
    const sensitive = {
      familyIncome: 250000,
      category: 'SC',
      disability: { has: true, percent: 40 },
    }
    const res = await agent.put('/api/v1/profile').send(sensitive)
    expect(res.body).toMatchObject(sensitive)

    const raw = await rawProfile(user.id)
    for (const key of ['familyIncome', 'category', 'disability'] as const) {
      expect(raw[key]).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)
      expect(decrypt(raw[key])).toEqual(sensitive[key])
    }
    const stored = JSON.stringify(raw)
    expect(stored).not.toContain('250000')
    expect(stored).not.toContain('"SC"')
    expect(stored).not.toContain('percent')

    expect((await agent.get('/api/v1/profile')).body).toMatchObject(sensitive)
  })

  it('keeps earlier steps and bumps profileVersion on every save', async () => {
    const { agent } = await registeredAgent()
    await agent.put('/api/v1/profile').send({ cgpa: 8 })
    const res = await agent.put('/api/v1/profile').send({ rural: false })
    expect(res.body).toEqual({ cgpa: 8, rural: false, profileVersion: 2 })
  })

  it('clears a field sent as null and leaves missing fields alone', async () => {
    const { agent, user } = await registeredAgent()
    await agent.put('/api/v1/profile').send({ cgpa: 8, category: 'OBC', courseName: 'B.Tech' })
    const res = await agent.put('/api/v1/profile').send({ cgpa: null, category: null })
    expect(res.body).toEqual({ courseName: 'B.Tech', profileVersion: 2 })

    const raw = await rawProfile(user.id)
    expect(raw).not.toHaveProperty('cgpa')
    expect(raw).not.toHaveProperty('category')
  })

  it('merges document flags instead of replacing them', async () => {
    const { agent } = await registeredAgent()
    await agent.put('/api/v1/profile').send({ docs: { incomeCertificate: true } })
    const res = await agent.put('/api/v1/profile').send({ docs: { feeReceipt: false } })
    expect(res.body.docs).toEqual({ incomeCertificate: true, feeReceipt: false })
  })

  it.each([
    ['out-of-range percent', { class12Percent: 101 }, 'class12Percent'],
    ['income with paise', { familyIncome: 1000.5 }, 'familyIncome'],
    ['string where a number goes', { yearOfStudy: '2' }, 'yearOfStudy'],
    ['year 6', { yearOfStudy: 6 }, 'yearOfStudy'],
    ['unknown course', { courseCategory: 'astrology' }, 'courseCategory'],
    ['bad date', { dateOfBirth: '2005-13-45' }, 'dateOfBirth'],
    [
      'percent without a disability',
      { disability: { has: false, percent: 40 } },
      'disability.percent',
    ],
    ['unknown document flag', { docs: { panNumber: true } }, 'docs'],
  ])('400 for %s, naming the field', async (_name, body, field) => {
    const { agent } = await registeredAgent()
    const res = await agent.put('/api/v1/profile').send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
    expect(res.body.error.fields).toHaveProperty(field)
    expect(await ProfileModel.countDocuments()).toBe(0)
  })

  it.each([
    ['an Aadhaar number', { aadhaarNumber: '123412341234' }],
    ['a bank account', { bankAccount: '0011223344' }],
    ['a role', { role: 'admin' }],
    ['another student id', { userId: '507f1f77bcf86cd799439011' }],
    ['a chosen version', { profileVersion: 99 }],
    ['a Mongo operator', { $set: { cgpa: 10 } }],
  ])('400 and nothing stored when the body has %s', async (_name, body) => {
    const { agent } = await registeredAgent()
    const res = await agent.put('/api/v1/profile').send(body)
    expect(res.status).toBe(400)
    expect(await ProfileModel.countDocuments()).toBe(0)
  })

  it('401 when logged out', async () => {
    const res = await request(testApp()).put('/api/v1/profile').send({ cgpa: 8 })
    expect(res.status).toBe(401)
  })

  it('401 and no new profile when the account no longer exists', async () => {
    const { agent } = await registeredAgent()
    await User.deleteMany({})
    expect((await agent.put('/api/v1/profile').send({ cgpa: 8 })).status).toBe(401)
    expect((await agent.get('/api/v1/profile')).status).toBe(401)
    expect(await ProfileModel.countDocuments()).toBe(0)
  })

  it('415 for a non-JSON body', async () => {
    const { agent } = await registeredAgent()
    const res = await agent.put('/api/v1/profile').type('form').send({ cgpa: 8 })
    expect(res.status).toBe(415)
  })

  it('keeps each student to their own profile', async () => {
    const app = testApp()
    const asha = await registeredAgent(app, 'asha@example.com')
    const ravi = await registeredAgent(app, 'ravi@example.com')
    await asha.agent.put('/api/v1/profile').send({ familyIncome: 100000 })
    await ravi.agent.put('/api/v1/profile').send({ familyIncome: 900000 })

    expect((await asha.agent.get('/api/v1/profile')).body.familyIncome).toBe(100000)
    expect((await ravi.agent.get('/api/v1/profile')).body.familyIncome).toBe(900000)
  })

  it('handles two first saves at once without an error', async () => {
    const { agent } = await registeredAgent()
    const [a, b] = await Promise.all([
      agent.put('/api/v1/profile').send({ cgpa: 8 }),
      agent.put('/api/v1/profile').send({ rural: true }),
    ])
    expect([a.status, b.status]).toEqual([200, 200])
    const profile = (await agent.get('/api/v1/profile')).body
    expect(profile).toEqual({ cgpa: 8, rural: true, profileVersion: 2 })
  })

  it('feeds GET /me profileComplete', async () => {
    const { agent } = await registeredAgent()
    expect((await agent.get('/api/v1/me')).body.profileComplete).toBe(0)
    await agent.put('/api/v1/profile').send({ courseCategory: 'law', category: 'ST' })
    expect((await agent.get('/api/v1/me')).body.profileComplete).toBeGreaterThan(0)
  })
})
