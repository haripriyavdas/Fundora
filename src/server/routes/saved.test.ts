import { readFileSync } from 'node:fs'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { SchemeFile } from '../../shared/schemas/index.js'
import { Application } from '../models/Application.js'
import { Notification } from '../models/Notification.js'
import { Scheme as SchemeModel } from '../models/Scheme.js'
import { User } from '../models/User.js'
import { outbox } from '../services/email.js'
import { reminderSendAt, runReminders } from '../services/reminders.js'
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

/** A verified student with a session. Reminders only go to verified students. */
async function student(email = 'asha@example.com', app = testApp()) {
  const s = await registeredAgent(app, email)
  await User.updateOne({ _id: s.user.id }, { $set: { verified: true } })
  outbox.length = 0 // drop the sign-up verification email; tests look at reminders only
  return s
}

// A date a few weeks ahead, so the 14, 7 and 1 day reminders are all in the future
const inDays = (n: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('/saved', () => {
  it('saves, lists, updates and removes a scheme', async () => {
    await seedScheme({ id: 'girls-engineering', closesOn: inDays(30) })
    const { agent } = await student()

    const created = await agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ schemeId: 'girls-engineering', stage: 'saved' })
    expect(created.body.savedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const list = await agent.get('/api/v1/saved')
    expect(list.body).toHaveLength(1)

    const applied = await agent
      .patch('/api/v1/saved/girls-engineering')
      .send({ stage: 'applied', notes: 'Sent on NSP' })
    expect(applied.status).toBe(200)
    expect(applied.body).toMatchObject({ stage: 'applied', notes: 'Sent on NSP' })
    expect(applied.body.appliedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const cleared = await agent.patch('/api/v1/saved/girls-engineering').send({ notes: null })
    expect(cleared.body.notes).toBeUndefined()

    expect((await agent.delete('/api/v1/saved/girls-engineering')).status).toBe(204)
    expect((await agent.get('/api/v1/saved')).body).toEqual([])
    expect(await Notification.countDocuments()).toBe(0)
  })

  it('creates reminders 14, 7 and 1 days before the deadline', async () => {
    const closesOn = inDays(30)
    await seedScheme({ id: 'girls-engineering', closesOn })
    const { agent } = await student()
    await agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })

    const reminders = await Notification.find().sort({ sendAt: 1 }).lean()
    expect(reminders.map((n) => n.daysBefore)).toEqual([14, 7, 1])
    expect(reminders[0].sendAt.toISOString()).toBe(reminderSendAt(closesOn, 14).toISOString())
  })

  it('skips reminders whose day has already passed', async () => {
    await seedScheme({ id: 'soon', closesOn: inDays(5) })
    const { agent } = await student()
    await agent.post('/api/v1/saved').send({ schemeId: 'soon' })
    expect((await Notification.find().lean()).map((n) => n.daysBefore)).toEqual([1])
  })

  it('refuses to save the same scheme twice (409)', async () => {
    await seedScheme({ id: 'girls-engineering' })
    const { agent } = await student()
    await agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })
    const again = await agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('ALREADY_SAVED')
  })

  it('404s for an unknown or retired scheme', async () => {
    await seedScheme({ id: 'old-one' }, 'retired')
    const { agent } = await student()
    expect((await agent.post('/api/v1/saved').send({ schemeId: 'old-one' })).status).toBe(404)
    expect((await agent.post('/api/v1/saved').send({ schemeId: 'no-such' })).status).toBe(404)
  })

  it('rejects bad bodies (400)', async () => {
    const { agent } = await student()
    expect((await agent.post('/api/v1/saved').send({})).status).toBe(400)
    expect(
      (await agent.post('/api/v1/saved').send({ schemeId: 'x', userId: 'someone' })).status,
    ).toBe(400)
    await seedScheme({ id: 'girls-engineering' })
    await agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })
    const badStage = await agent.patch('/api/v1/saved/girls-engineering').send({ stage: 'won' })
    expect(badStage.status).toBe(400)
    expect((await agent.patch('/api/v1/saved/girls-engineering').send({})).status).toBe(400)
  })

  it('needs a session (401)', async () => {
    const app = testApp()
    expect((await request(app).get('/api/v1/saved')).status).toBe(401)
    expect((await request(app).post('/api/v1/saved').send({ schemeId: 'x' })).status).toBe(401)
  })

  it("can't see or change another student's list (404)", async () => {
    await seedScheme({ id: 'girls-engineering' })
    const app = testApp()
    const asha = await student('asha@example.com', app)
    const ravi = await student('ravi@example.com', app)
    await asha.agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })

    expect((await ravi.agent.get('/api/v1/saved')).body).toEqual([])
    const patch = await ravi.agent
      .patch('/api/v1/saved/girls-engineering')
      .send({ stage: 'applied' })
    expect(patch.status).toBe(404)
    expect((await ravi.agent.delete('/api/v1/saved/girls-engineering')).status).toBe(404)
    expect((await Application.findOne().lean())?.stage).toBe('saved')
  })
})

describe('/notifications/settings', () => {
  it('defaults to on and can be changed', async () => {
    const { agent } = await student()
    expect((await agent.get('/api/v1/notifications/settings')).body).toEqual({
      deadlineEmails: true,
      renewalEmails: true,
    })
    const res = await agent.patch('/api/v1/notifications/settings').send({ deadlineEmails: false })
    expect(res.body).toEqual({ deadlineEmails: false, renewalEmails: true })
    expect((await agent.get('/api/v1/notifications/settings')).body.deadlineEmails).toBe(false)
  })

  it('rejects unknown fields and needs a session', async () => {
    const { agent } = await student()
    expect(
      (await agent.patch('/api/v1/notifications/settings').send({ smsAlerts: true })).status,
    ).toBe(400)
    expect((await request(testApp()).get('/api/v1/notifications/settings')).status).toBe(401)
  })
})

describe('runReminders', () => {
  const closesOn = '2027-03-31'
  const at = (daysBefore: number) => reminderSendAt(closesOn, daysBefore)

  async function savedFor(email = 'asha@example.com') {
    await seedScheme({ id: 'girls-engineering', name: 'Girls in Engineering Award', closesOn })
    const s = await student(email)
    // Saved well before the deadline
    await s.agent.post('/api/v1/saved').send({ schemeId: 'girls-engineering' })
    return s
  }

  it('sends a due reminder once, even when run twice', async () => {
    await savedFor()
    const first = await runReminders(at(14))
    expect(first).toMatchObject({ sent: 1, skipped: 0 })
    expect(outbox).toHaveLength(1)
    expect(outbox[0].subject).toBe('14 days left: Girls in Engineering Award')
    expect(outbox[0].text).toContain('/schemes/girls-engineering')

    const second = await runReminders(at(14))
    expect(second).toMatchObject({ sent: 0, skipped: 0 })
    expect(outbox).toHaveLength(1)
  })

  it('skips reminders for applied schemes', async () => {
    const { agent } = await savedFor()
    await agent.patch('/api/v1/saved/girls-engineering').send({ stage: 'applied' })
    expect(await runReminders(at(7))).toMatchObject({ sent: 0 })
    expect(outbox).toHaveLength(0)
  })

  it('skips when deadline emails are off or the student is unverified', async () => {
    const { agent, user } = await savedFor()
    await agent.patch('/api/v1/notifications/settings').send({ deadlineEmails: false })
    expect(await runReminders(at(14))).toMatchObject({ sent: 0, skipped: 1 })

    await agent.patch('/api/v1/notifications/settings').send({ deadlineEmails: true })
    await User.updateOne({ _id: user.id }, { $set: { verified: false } })
    expect(await runReminders(at(7))).toMatchObject({ sent: 0, skipped: 1 })
    expect(outbox).toHaveLength(0)
  })

  it('drops a reminder when the deadline has moved', async () => {
    await savedFor()
    await SchemeModel.updateOne({ id: 'girls-engineering' }, { $set: { closesOn: '2027-04-30' } })
    // The old 14-day reminder no longer matches; the job makes new ones for the new date
    expect(await runReminders(at(14))).toMatchObject({ sent: 0, skipped: 1 })
    expect(await Notification.countDocuments({ sentAt: { $exists: false } })).toBe(5)
  })

  it('moves applied schemes to renewal_due when the next round opens', async () => {
    await seedScheme({
      id: 'renewable',
      name: 'Renewable Award',
      opensOn: '2027-07-01',
      closesOn: '2027-10-31',
      renewal: { text: 'Keep 75% attendance.' },
    })
    const { agent } = await student()
    await agent.post('/api/v1/saved').send({ schemeId: 'renewable' })
    await agent.patch('/api/v1/saved/renewable').send({ stage: 'applied' })

    const opening = reminderSendAt('2027-07-01', 0)
    const counts = await runReminders(opening)
    expect(counts.renewalsDue).toBe(1)
    expect((await agent.get('/api/v1/saved')).body[0].stage).toBe('renewal_due')
    expect(outbox.map((e) => e.subject)).toContain('Time to renew: Renewable Award')
  })
})
