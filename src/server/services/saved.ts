import { todayInIndia } from '../../shared/dates.js'
import type { SavedScheme, SavedStage, UpdateSavedBody } from '../../shared/schemas/index.js'
import { HttpError } from '../lib/httpError.js'
import { Application, type ApplicationFields } from '../models/Application.js'
import { Notification } from '../models/Notification.js'
import { loadActiveScheme } from './matching.js'
import { ensureDeadlineReminders } from './reminders.js'

export function toSavedScheme(doc: ApplicationFields): SavedScheme {
  return {
    schemeId: doc.schemeId,
    stage: doc.stage as SavedStage,
    savedOn: todayInIndia(doc.savedOn),
    ...(doc.appliedOn ? { appliedOn: todayInIndia(doc.appliedOn) } : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
  }
}

export async function listSaved(userId: string): Promise<SavedScheme[]> {
  const docs = await Application.find({ userId }).sort({ savedOn: -1 }).lean()
  return docs.map(toSavedScheme)
}

/** Adds a scheme to the tracker as `saved` and creates its deadline reminders. */
export async function saveScheme(userId: string, schemeId: string, now = new Date()) {
  const scheme = await loadActiveScheme(schemeId)
  if (!scheme) throw new HttpError(404, 'NOT_FOUND', 'That scheme was not found.')
  let doc
  try {
    doc = await Application.create({ userId, schemeId, stage: 'saved', savedOn: now })
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new HttpError(409, 'ALREADY_SAVED', 'You have already saved this scheme.')
    throw err
  }
  await ensureDeadlineReminders(userId, scheme, now)
  return toSavedScheme(doc)
}

/** Changes the stage and/or notes. Moving to `applied` records today as appliedOn. */
export async function updateSaved(
  userId: string,
  schemeId: string,
  body: UpdateSavedBody,
  now = new Date(),
) {
  const doc = await Application.findOne({ userId, schemeId })
  if (!doc) throw new HttpError(404, 'NOT_FOUND', 'That scheme is not in your list.')

  if (body.stage && body.stage !== doc.stage) {
    if (body.stage === 'applied') doc.appliedOn = now
    doc.stage = body.stage
  }
  if (body.notes === null || body.notes === '') doc.notes = undefined
  else if (body.notes !== undefined) doc.notes = body.notes
  await doc.save()

  // Moved back from applied: deadline reminders apply again
  if (doc.stage !== 'applied') {
    const scheme = await loadActiveScheme(schemeId)
    if (scheme) await ensureDeadlineReminders(userId, scheme, now)
  }
  return toSavedScheme(doc)
}

/** Removes a scheme from the tracker and any reminders for it that haven't gone out. */
export async function removeSaved(userId: string, schemeId: string) {
  const res = await Application.deleteOne({ userId, schemeId })
  if (!res.deletedCount) throw new HttpError(404, 'NOT_FOUND', 'That scheme is not in your list.')
  await Notification.deleteMany({ userId, schemeId, sentAt: { $exists: false } })
}
