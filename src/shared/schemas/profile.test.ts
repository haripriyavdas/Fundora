import { describe, expect, it } from 'vitest'
import { COURSE_CATEGORIES, STATE_CODES } from '../constants.js'
import {
  DERIVED_PROFILE_FIELDS,
  PROFILE_FIELDS,
  ProfileFieldsSchema,
  ProfileUpdateBody,
  STORED_PROFILE_FIELDS,
  type ProfileFields,
} from './profile.js'

// Made-up data with every field filled
const FULL_PROFILE = {
  educationLevel: 'UG',
  courseCategory: 'engineering',
  courseName: 'B.E. Mechanical',
  yearOfStudy: 2,
  institutionState: 'KA',
  institutionType: 'aided',
  class10Percent: 91,
  class12Percent: 88.5,
  cgpa: 8.2,
  attendancePercent: 80,
  familyIncome: 250000,
  parentOccupation: 'farmer',
  firstGenLearner: true,
  orphan: false,
  singleParent: false,
  defenceWard: false,
  category: 'OBC',
  minority: false,
  gender: 'female',
  disability: { has: true, percent: 40 },
  domicileState: 'KA',
  rural: true,
  nationality: 'indian',
  dateOfBirth: '2006-05-14',
  hasOtherScholarship: true,
  otherScholarshipName: 'Vidyasiri',
  docs: {
    incomeCertificate: true,
    casteCertificate: true,
    disabilityCertificate: false,
    domicileCertificate: true,
    bankAadhaarSeeded: true,
    class12Marksheet: true,
    feeReceipt: false,
  },
} satisfies ProfileFields

function leafNames(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafNames(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('profile schema', () => {
  it('has the 19 course categories and all 36 states and territories', () => {
    expect(new Set(COURSE_CATEGORIES).size).toBe(19)
    expect(new Set(STATE_CODES).size).toBe(36)
  })

  it('accepts a full profile', () => {
    expect(ProfileFieldsSchema.parse(FULL_PROFILE)).toEqual(FULL_PROFILE)
  })

  it('PROFILE_FIELDS lists every stored field, plus the derived ones', () => {
    expect([...STORED_PROFILE_FIELDS].sort()).toEqual(leafNames(FULL_PROFILE).sort())
    expect(PROFILE_FIELDS).toEqual(expect.arrayContaining([...DERIVED_PROFILE_FIELDS]))
  })

  it('never has a field for an ID number, bank account or password', () => {
    const banned = /aadhaar(num|no)|account|pan(num|no)?$|password|passport|voter/i
    expect(PROFILE_FIELDS.filter((field) => banned.test(field))).toEqual([])
  })

  it.each([
    ['class10Percent', 0, true],
    ['class10Percent', 100, true],
    ['class10Percent', 100.1, false],
    ['class10Percent', -1, false],
    ['class10Percent', Number.NaN, false],
    ['cgpa', 10, true],
    ['cgpa', 10.1, false],
    ['yearOfStudy', 1, true],
    ['yearOfStudy', 5, true],
    ['yearOfStudy', 0, false],
    ['yearOfStudy', 1.5, false],
    ['familyIncome', 0, true],
    ['familyIncome', 1000.5, false],
    ['familyIncome', -1, false],
    ['dateOfBirth', '2006-02-29', false],
    ['dateOfBirth', '2999-01-01', false],
    ['dateOfBirth', '14/05/2006', false],
    ['courseName', '   ', false],
    ['category', 'gen', false],
    ['institutionState', 'XX', false],
    ['educationLevel', 'PG', false],
  ])('%s = %j → valid: %s', (field, value, ok) => {
    expect(ProfileUpdateBody.safeParse({ [field]: value }).success).toBe(ok)
  })

  it('trims text', () => {
    expect(ProfileUpdateBody.parse({ courseName: '  B.Sc  ' }).courseName).toBe('B.Sc')
  })

  it('accepts null to clear any field, and an empty save', () => {
    expect(ProfileUpdateBody.safeParse({}).success).toBe(true)
    for (const key of Object.keys(ProfileUpdateBody.shape)) {
      expect(ProfileUpdateBody.safeParse({ [key]: null }).success).toBe(true)
    }
  })

  it('rejects unknown keys, at the top level and inside docs and disability', () => {
    expect(ProfileUpdateBody.safeParse({ aadhaarNumber: '1' }).success).toBe(false)
    expect(ProfileUpdateBody.safeParse({ docs: { panNumber: true } }).success).toBe(false)
    expect(ProfileUpdateBody.safeParse({ disability: { has: true, id: 'x' } }).success).toBe(false)
  })

  it('allows a disability percent only when has is true', () => {
    expect(ProfileUpdateBody.safeParse({ disability: { has: true } }).success).toBe(true)
    expect(ProfileUpdateBody.safeParse({ disability: { has: true, percent: 40 } }).success).toBe(
      true,
    )
    expect(ProfileUpdateBody.safeParse({ disability: { has: false, percent: 40 } }).success).toBe(
      false,
    )
  })
})
