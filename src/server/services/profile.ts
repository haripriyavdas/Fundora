import {
  PROFILE_KEYS,
  SENSITIVE_PROFILE_KEYS,
  type Profile,
  type ProfileUpdateBody,
} from '../../shared/schemas/index.js'
import { ProfileModel } from '../models/Profile.js'
import { decrypt, encrypt } from './crypto.js'

const SENSITIVE = new Set<string>(SENSITIVE_PROFILE_KEYS)
const DUPLICATE_KEY = 11000

/** Turns a validated partial save into a Mongo update: null clears, `docs` merges, version +1. */
export function toMongoUpdate(body: ProfileUpdateBody) {
  const $set: Record<string, unknown> = {}
  const $unset: Record<string, 1> = {}

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue
    if (value === null) {
      $unset[key] = 1
    } else if (key === 'docs') {
      // Dotted paths, so saving one flag doesn't wipe the others
      for (const [doc, held] of Object.entries(value)) $set[`docs.${doc}`] = held
    } else {
      $set[key] = SENSITIVE.has(key) ? encrypt(value) : value
    }
  }

  return {
    ...(Object.keys($set).length > 0 ? { $set } : {}),
    ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    $inc: { profileVersion: 1 },
  }
}

/** A stored document → the API shape: decrypted, without userId, _id or timestamps. */
export function toProfile(stored: Record<string, unknown> | null): Profile {
  const profile: Record<string, unknown> = { profileVersion: stored?.profileVersion ?? 0 }
  for (const key of PROFILE_KEYS) {
    const value = stored?.[key]
    if (value === undefined || value === null) continue
    profile[key] = SENSITIVE.has(key) ? decrypt(value as string) : value
  }
  return profile as Profile
}

export async function getProfile(userId: string): Promise<Profile> {
  return toProfile(await ProfileModel.findOne({ userId }).lean())
}

export async function saveProfile(userId: string, body: ProfileUpdateBody): Promise<Profile> {
  const save = () =>
    ProfileModel.findOneAndUpdate({ userId }, toMongoUpdate(body), {
      upsert: true,
      returnDocument: 'after',
    }).lean()

  try {
    return toProfile(await save())
  } catch (err) {
    // Two first saves at once: one insert wins the unique index, so the other becomes an update
    if ((err as { code?: number }).code !== DUPLICATE_KEY) throw err
    return toProfile(await save())
  }
}
