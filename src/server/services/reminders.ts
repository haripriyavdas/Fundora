import type { Types } from 'mongoose'
import { addDays, daysBetween, formatDate, todayInIndia } from '../../shared/dates.js'
import type { SavedStage } from '../../shared/schemas/index.js'
import { logger } from '../lib/logger.js'
import { Application } from '../models/Application.js'
import { Notification } from '../models/Notification.js'
import { Scheme } from '../models/Scheme.js'
import { User } from '../models/User.js'
import { sendDeadlineReminder, sendRenewalReminder } from './email.js'

/** Deadline reminders go out this many days before `closesOn`. */
export const REMINDER_DAYS = [14, 7, 1] as const

/** Stages that still need deadline reminders. Applied schemes don't. */
const NEEDS_DEADLINE: SavedStage[] = ['saved', 'renewal_due']

/** A reminder older than this when the job finally runs is dropped rather than sent late. */
const MAX_LATE_MS = 36 * 60 * 60 * 1000

/** 08:00 IST (02:30 UTC) on the India date `daysBefore` days before `date`. */
export function reminderSendAt(date: string, daysBefore: number): Date {
  return new Date(`${addDays(date, -daysBefore)}T02:30:00Z`)
}

/**
 * Creates the 14, 7 and 1 day reminders for one saved scheme. Only future ones; safe to repeat
 * (the unique index plus $setOnInsert means existing reminders are left alone).
 */
export async function ensureDeadlineReminders(
  userId: string,
  scheme: { id: string; closesOn?: string | null },
  now: Date,
): Promise<void> {
  if (!scheme.closesOn) return // open all year: nothing to remind about
  const closesOn = scheme.closesOn
  const ops = REMINDER_DAYS.map((daysBefore) => ({
    daysBefore,
    sendAt: reminderSendAt(closesOn, daysBefore),
  }))
    .filter(({ sendAt }) => sendAt > now)
    .map(({ daysBefore, sendAt }) => ({
      updateOne: {
        filter: { userId, schemeId: scheme.id, kind: 'deadline' as const, sendAt },
        update: { $setOnInsert: { daysBefore } },
        upsert: true,
      },
    }))
  if (ops.length) await Notification.bulkWrite(ops, { ordered: false })
}

/**
 * Applied schemes that have a renewal and whose next round has opened since the student applied
 * move to `renewal_due`, with a renewal reminder. Returns how many moved.
 */
export async function markRenewalsDue(now: Date): Promise<number> {
  const today = todayInIndia(now)
  const schemes = await Scheme.find(
    { status: 'active', renewal: { $exists: true, $ne: null }, opensOn: { $lte: today } },
    { id: 1, opensOn: 1 },
  ).lean()
  let moved = 0
  for (const scheme of schemes) {
    const opensOn = scheme.opensOn as string
    // Applied before this round opened (appliedOn is stored as a moment; compare India dates)
    const openedAt = new Date(`${opensOn}T00:00:00+05:30`)
    const apps = await Application.find(
      { schemeId: scheme.id, stage: 'applied', appliedOn: { $lt: openedAt } },
      { userId: 1 },
    ).lean()
    for (const app of apps) {
      const res = await Application.updateOne(
        { _id: app._id, stage: 'applied' },
        { $set: { stage: 'renewal_due' } },
      )
      if (!res.modifiedCount) continue
      moved++
      await Notification.updateOne(
        {
          userId: app.userId,
          schemeId: scheme.id,
          kind: 'renewal',
          sendAt: reminderSendAt(opensOn, 0),
        },
        { $setOnInsert: { daysBefore: 0 } },
        { upsert: true },
      )
    }
  }
  return moved
}

/** Re-creates deadline reminders for every tracked scheme, so a changed closesOn is picked up. */
async function syncDeadlineReminders(now: Date) {
  const today = todayInIndia(now)
  const schemes = await Scheme.find(
    { status: 'active', closesOn: { $gte: today } },
    { id: 1, closesOn: 1 },
  ).lean()
  for (const scheme of schemes) {
    const apps = await Application.find(
      { schemeId: scheme.id, stage: { $in: NEEDS_DEADLINE } },
      { userId: 1 },
    ).lean()
    for (const app of apps) {
      await ensureDeadlineReminders(
        String(app.userId),
        { id: scheme.id, closesOn: scheme.closesOn },
        now,
      )
    }
  }
}

type Claimed = {
  _id: Types.ObjectId
  userId: Types.ObjectId
  schemeId: string
  kind: 'deadline' | 'renewal'
  daysBefore?: number | null
  sendAt: Date
}

/** Sends one claimed reminder if it still applies. Returns false when it should be skipped. */
async function deliver(n: Claimed, now: Date): Promise<boolean> {
  if (now.getTime() - n.sendAt.getTime() > MAX_LATE_MS) return false

  const user = await User.findById(n.userId, {
    email: 1,
    verified: 1,
    deadlineEmails: 1,
    renewalEmails: 1,
  }).lean()
  if (!user?.verified) return false
  // Missing setting (older accounts) counts as on
  if (n.kind === 'deadline' && user.deadlineEmails === false) return false
  if (n.kind === 'renewal' && user.renewalEmails === false) return false

  const app = await Application.findOne(
    { userId: n.userId, schemeId: n.schemeId },
    { stage: 1 },
  ).lean()
  const scheme = await Scheme.findOne(
    { id: n.schemeId, status: 'active' },
    { id: 1, name: 1, closesOn: 1 },
  ).lean()
  if (!app || !scheme) return false

  if (n.kind === 'renewal') {
    if (app.stage !== 'renewal_due') return false
    await sendRenewalReminder(user.email, { id: scheme.id, name: scheme.name })
    return true
  }

  if (!NEEDS_DEADLINE.includes(app.stage as SavedStage)) return false
  // The deadline moved since this reminder was made: a fresh one exists for the new date
  if (!scheme.closesOn || n.daysBefore == null) return false
  if (reminderSendAt(scheme.closesOn, n.daysBefore).getTime() !== n.sendAt.getTime()) return false

  const daysLeft = daysBetween(todayInIndia(now), scheme.closesOn)
  if (daysLeft < 0) return false
  await sendDeadlineReminder(
    user.email,
    { id: scheme.id, name: scheme.name },
    formatDate(scheme.closesOn),
    daysLeft,
  )
  return true
}

/**
 * The daily job. Safe to run twice: each reminder is claimed by setting `sentAt` in one atomic
 * update before it is sent, so no reminder goes out more than once. Returns counts only.
 */
export async function runReminders(now = new Date()) {
  const renewalsDue = await markRenewalsDue(now)
  await syncDeadlineReminders(now)

  let sent = 0
  let skipped = 0
  for (;;) {
    const n = (await Notification.findOneAndUpdate(
      { sentAt: { $exists: false }, sendAt: { $lte: now } },
      { $set: { sentAt: now } },
      { sort: { sendAt: 1 }, new: true },
    ).lean()) as Claimed | null
    if (!n) break
    let ok = false
    try {
      ok = await deliver(n, now)
    } catch (err) {
      logger.error({ err, notificationId: String(n._id) }, 'reminder failed')
    }
    if (ok) {
      sent++
    } else {
      skipped++
      await Notification.updateOne({ _id: n._id }, { $set: { skipped: true } })
    }
  }
  return { renewalsDue, sent, skipped }
}
