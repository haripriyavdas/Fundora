import { describe, expect, it } from 'vitest'
import { STORED_PROFILE_FIELDS } from '../../shared/schemas/index.js'
import { ProfileModel } from '../models/Profile.js'
import { decrypt, encrypt } from './crypto.js'
import { toMongoUpdate, toProfile } from './profile.js'

// These need no database, so they also run where mongodb-memory-server can't start.
describe('toMongoUpdate', () => {
  it('encrypts the three sensitive fields and nothing else', () => {
    const { $set } = toMongoUpdate({
      familyIncome: 250000,
      category: 'SC',
      disability: { has: true, percent: 40 },
      gender: 'female',
    })
    expect($set?.gender).toBe('female')
    expect(decrypt($set?.familyIncome as string)).toBe(250000)
    expect(decrypt($set?.category as string)).toBe('SC')
    expect(decrypt($set?.disability as string)).toEqual({ has: true, percent: 40 })
  })

  it('keeps a missing field out, unsets a null one', () => {
    expect(toMongoUpdate({ cgpa: null, courseName: undefined })).toEqual({
      $unset: { cgpa: 1 },
      $inc: { profileVersion: 1 },
    })
  })

  it('treats 0 and false as answers, not as blanks', () => {
    const { $set } = toMongoUpdate({ cgpa: 0, rural: false })
    expect($set).toEqual({ cgpa: 0, rural: false })
  })

  it('writes docs as dotted paths so one flag does not wipe the others', () => {
    expect(toMongoUpdate({ docs: { feeReceipt: true } }).$set).toEqual({ 'docs.feeReceipt': true })
  })

  it('still bumps the version on an empty save', () => {
    expect(toMongoUpdate({})).toEqual({ $inc: { profileVersion: 1 } })
  })
})

describe('toProfile', () => {
  it('returns version 0 and no fields when nothing is saved yet', () => {
    expect(toProfile(null)).toEqual({ profileVersion: 0 })
  })

  it('decrypts sensitive fields and leaves out Mongo and system fields', () => {
    expect(
      toProfile({
        _id: 'x',
        userId: 'y',
        createdAt: new Date(),
        profileVersion: 3,
        cgpa: 8.5,
        category: encrypt('OBC'),
      }),
    ).toEqual({ profileVersion: 3, cgpa: 8.5, category: 'OBC' })
  })
})

describe('Profile model', () => {
  // strict mode silently drops unknown paths, so a missing one would lose data without an error
  it.each(STORED_PROFILE_FIELDS.filter((f) => !f.startsWith('disability.')))(
    'has a path for %s',
    (field) => {
      expect(ProfileModel.schema.path(field)).toBeDefined()
    },
  )

  it('stores disability as one encrypted string', () => {
    expect(ProfileModel.schema.path('disability').instance).toBe('String')
  })

  it('stores the sensitive fields as strings, not typed values', () => {
    expect(ProfileModel.schema.path('familyIncome').instance).toBe('String')
    expect(ProfileModel.schema.path('category').instance).toBe('String')
  })
})
