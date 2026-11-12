import { readFileSync } from 'node:fs'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { Scheme, SchemeFile } from '../../shared/schemas/index.js'
import { MatchResultModel } from '../models/MatchResult.js'
import { Scheme as SchemeModel } from '../models/Scheme.js'
import { registeredAgent, testApp, useTestDb } from '../test/setup.js'

useTestDb()

const example = JSON.parse(readFileSync('data/schemes/_example.json', 'utf8')) as SchemeFile

/** Stores a scheme the way the seed would. Test setup only; the app never writes schemes. */
async function seedScheme(
  overrides: Partial<SchemeFile> & { id: string },
  status: 'active' | 'retired' = 'active',
) {
  await SchemeModel.create({
    ...example,
    closesOn: '2099-12-31',
    ...overrides,
    status,
    dataVersion: 1,
    contentHash: overrides.id,
    seededAt: new Date(),
  })
}

// Fits _example's rules fully
const FITS = {
  courseCategory: 'engineering',
  yearOfStudy: 1,
  gender: 'female',
  familyIncome: 200000,
  class12Percent: 80,
}

async function seedThree() {
  await seedScheme({ id: 'girls-engineering', name: 'Girls in Engineering Award' })
  await seedScheme({
    id: 'arts-loan',
    name: 'Arts Study Loan',
    aidType: 'loan',
    providerType: 'bank',
    groups: [],
    states: ['KA'],
    closesOn: null,
    rules: [{ field: 'courseCategory', op: 'in', value: ['arts'], hard: true }],
  })
  await seedScheme({
    id: 'old-closed',
    name: 'Closed Last Year',
    closesOn: '2020-03-31',
    opensOn: '2020-01-01',
  })
}

const ids = (body: Scheme[]) => body.map((s) => s.id)

describe('GET /schemes', () => {
  it('lists active schemes for a logged-out visitor, with match unknown and no internal fields', async () => {
    await seedThree()
    await seedScheme({ id: 'retired-one' }, 'retired')

    const res = await request(testApp()).get('/api/v1/schemes')
    expect(res.status).toBe(200)
    expect(ids(res.body)).toHaveLength(3)
    expect(ids(res.body)).not.toContain('retired-one')
    for (const scheme of res.body as Record<string, unknown>[]) {
      expect(scheme.match).toMatchObject({ state: 'unknown', score: 0 })
      for (const key of [
        'rules',
        'notes',
        'status',
        'contentHash',
        'dataVersion',
        '_id',
        'eligibility',
      ]) {
        expect(scheme).not.toHaveProperty(key)
      }
    }
    // Logged out sorts by closing: open schemes first, all-year (null) after dated ones
    expect(ids(res.body)).toEqual(['girls-engineering', 'arts-loan', 'old-closed'])
    expect(res.body.find((s: Scheme) => s.id === 'old-closed').isOpen).toBe(false)
  })

  it('treats a bad session cookie as logged out', async () => {
    await seedThree()
    const res = await request(testApp())
      .get('/api/v1/schemes')
      .set('Cookie', 'fundora_session=nonsense')
    expect(res.status).toBe(200)
    expect(res.body[0].match.state).toBe('unknown')
  })

  it('matches a signed-in student against their own profile, best match first', async () => {
    await seedThree()
    const { agent } = await registeredAgent()
    await agent.put('/api/v1/profile').send(FITS).expect(200)

    const res = await agent.get('/api/v1/schemes')
    expect(res.status).toBe(200)
    const byId = Object.fromEntries((res.body as Scheme[]).map((s) => [s.id, s.match]))
    expect(byId['girls-engineering']).toMatchObject({
      state: 'eligible',
      reason: 'You meet all 5 conditions.',
    })
    expect(byId['arts-loan']).toMatchObject({
      state: 'not',
      reason: 'This scheme is only for Arts students.',
    })
    expect(res.body[0].id).toBe('girls-engineering')
  })

  it('keeps results in an encrypted cache and rebuilds it when the profile changes', async () => {
    await seedThree()
    const { agent, user } = await registeredAgent()
    await agent.put('/api/v1/profile').send(FITS).expect(200)
    await agent.get('/api/v1/schemes').expect(200)

    const cache = await MatchResultModel.findOne({ userId: user.id }).lean()
    expect(cache).toMatchObject({ profileVersion: 1, dataVersion: 1 })
    expect(cache?.results).not.toContain('eligible')
    expect(cache?.results).not.toContain('girls-engineering')

    await agent.put('/api/v1/profile').send({ gender: 'male' }).expect(200)
    const res = await agent.get('/api/v1/schemes')
    expect(res.body.find((s: Scheme) => s.id === 'girls-engineering').match.state).toBe('not')
    expect(await MatchResultModel.countDocuments()).toBe(1)
    expect((await MatchResultModel.findOne().lean())?.profileVersion).toBe(2)
  })

  it("one student's profile never affects another's matches", async () => {
    await seedThree()
    const app = testApp()
    const { agent: asha } = await registeredAgent(app, 'asha@example.com')
    const { agent: ravi } = await registeredAgent(app, 'ravi@example.com')
    await asha.put('/api/v1/profile').send(FITS).expect(200)
    await asha.get('/api/v1/schemes').expect(200)

    const res = await ravi.get('/api/v1/schemes')
    const match = res.body.find((s: Scheme) => s.id === 'girls-engineering').match
    expect(match.state).toBe('unknown')
    expect(match.reason).toBe('Add your gender to check this scheme.')
  })

  it('filters by aid type, provider, group, state, open only and search text', async () => {
    await seedThree()
    const app = testApp()
    const get = async (query: string) =>
      ids((await request(app).get(`/api/v1/schemes?${query}`)).body)

    expect(await get('aidType=loan')).toEqual(['arts-loan'])
    expect(await get('providerType=bank')).toEqual(['arts-loan'])
    expect(await get('group=girls')).toEqual(['girls-engineering', 'old-closed'])
    expect(await get('state=TN')).toEqual(['girls-engineering', 'old-closed'])
    expect(await get('state=KA')).toHaveLength(3)
    expect(await get('openOnly=true')).toEqual(['girls-engineering', 'arts-loan'])
    expect(await get('q=STUDY%20loan')).toEqual(['arts-loan'])
    expect(await get('sort=name')).toEqual(['arts-loan', 'old-closed', 'girls-engineering'])
  })

  it('400 for an invalid filter value', async () => {
    const res = await request(testApp()).get('/api/v1/schemes?aidType=lottery')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('returns an empty list when nothing is seeded', async () => {
    const res = await request(testApp()).get('/api/v1/schemes')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /schemes/:id', () => {
  it('returns the scheme without rules, and no eligibility when logged out', async () => {
    await seedThree()
    const res = await request(testApp()).get('/api/v1/schemes/girls-engineering')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: 'girls-engineering',
      isOpen: true,
      match: { state: 'unknown' },
    })
    expect(res.body).not.toHaveProperty('rules')
    expect(res.body).not.toHaveProperty('notes')
    expect(res.body).not.toHaveProperty('eligibility')
  })

  it('explains every rule for a signed-in student', async () => {
    await seedThree()
    const { agent } = await registeredAgent()
    await agent
      .put('/api/v1/profile')
      .send({ ...FITS, familyIncome: 320000 })
      .expect(200)

    const res = await agent.get('/api/v1/schemes/girls-engineering')
    expect(res.status).toBe(200)
    expect(res.body.match).toMatchObject({ state: 'almost' })
    expect(res.body.eligibility).toHaveLength(5)
    expect(res.body.eligibility[3]).toEqual({
      rule: 'Family income up to ₹3,00,000',
      result: 'near',
      text: 'You are ₹20,000 above the income limit of ₹3,00,000.',
    })
  })

  it('404 for an unknown or retired scheme', async () => {
    await seedScheme({ id: 'retired-one' }, 'retired')
    expect((await request(testApp()).get('/api/v1/schemes/retired-one')).status).toBe(404)
    expect((await request(testApp()).get('/api/v1/schemes/no-such-scheme')).status).toBe(404)
  })

  it('400 for a malformed id', async () => {
    const res = await request(testApp()).get('/api/v1/schemes/Not_An_Id')
    expect(res.status).toBe(400)
  })
})
