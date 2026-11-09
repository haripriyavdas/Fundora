import { describe, expect, it } from 'vitest'
import { profileCompleteness, readProfileField } from './profileCompleteness.js'
import type { ProfileFields } from './schemas/profile.js'

describe('profileCompleteness', () => {
  it('is 0 for an empty profile', () => {
    expect(profileCompleteness({})).toBe(0)
  })

  it('does not count educationLevel, which the wizard sets by itself', () => {
    expect(profileCompleteness({ educationLevel: 'UG' })).toBe(0)
  })

  it('goes up as fields are filled', () => {
    const one = profileCompleteness({ courseName: 'B.Sc' })
    const two = profileCompleteness({ courseName: 'B.Sc', cgpa: 8 })
    expect(one).toBeGreaterThan(0)
    expect(two).toBeGreaterThan(one)
  })

  it('counts 0 and false as answers', () => {
    expect(profileCompleteness({ cgpa: 0, rural: false })).toBeGreaterThan(0)
  })

  it('counts each document flag', () => {
    expect(profileCompleteness({ docs: { feeReceipt: false } })).toBeGreaterThan(
      profileCompleteness({ docs: {} }),
    )
  })

  it('reaches 100 for a first-year student with no disability and no other scholarship', () => {
    expect(profileCompleteness(firstYearGeneral)).toBe(100)
  })

  it('reaches 100 for a full profile with every conditional field answered', () => {
    expect(profileCompleteness(fullProfile)).toBe(100)
  })

  it('stops counting the scholarship name after a No, but not while the answer is blank', () => {
    const { hasOtherScholarship: _, ...blank } = firstYearGeneral
    expect(profileCompleteness(blank)).toBeLessThan(100)
  })

  it('counts CGPA from the second year', () => {
    expect(profileCompleteness({ ...firstYearGeneral, yearOfStudy: 2 })).toBeLessThan(100)
  })

  it('counts disability percentage and certificate after a Yes', () => {
    expect(profileCompleteness({ ...firstYearGeneral, disability: { has: true } })).toBeLessThan(
      100,
    )
  })

  it('counts the caste certificate for every category except General', () => {
    expect(profileCompleteness({ ...firstYearGeneral, category: 'OBC' })).toBeLessThan(100)
    const { category: _, ...blank } = firstYearGeneral
    expect(profileCompleteness(blank)).toBeLessThan(100)
  })
})

/** Leaves out exactly the fields that don't apply: CGPA, scholarship name, disability %, two docs. */
const firstYearGeneral: ProfileFields = {
  educationLevel: 'UG',
  courseCategory: 'engineering',
  courseName: 'B.E. Mechanical',
  yearOfStudy: 1,
  institutionState: 'KA',
  institutionType: 'govt',
  class10Percent: 91,
  class12Percent: 88,
  attendancePercent: 85,
  familyIncome: 250000,
  parentOccupation: 'farmer',
  firstGenLearner: true,
  orphan: false,
  singleParent: false,
  defenceWard: false,
  category: 'GEN',
  minority: false,
  gender: 'female',
  disability: { has: false },
  domicileState: 'KA',
  rural: true,
  nationality: 'indian',
  dateOfBirth: '2007-05-14',
  hasOtherScholarship: false,
  docs: {
    incomeCertificate: true,
    domicileCertificate: true,
    bankAadhaarSeeded: true,
    class12Marksheet: true,
    feeReceipt: false,
  },
}

const fullProfile: ProfileFields = {
  ...firstYearGeneral,
  yearOfStudy: 3,
  cgpa: 8.2,
  category: 'SC',
  disability: { has: true, percent: 40 },
  hasOtherScholarship: true,
  otherScholarshipName: 'Post-Matric Scholarship',
  docs: { ...firstYearGeneral.docs, casteCertificate: true, disabilityCertificate: false },
}

describe('readProfileField', () => {
  it('reads top-level and dotted fields', () => {
    const profile = { cgpa: 8, docs: { feeReceipt: true } }
    expect(readProfileField(profile, 'cgpa')).toBe(8)
    expect(readProfileField(profile, 'docs.feeReceipt')).toBe(true)
  })

  it('returns undefined when the parent is missing', () => {
    expect(readProfileField({}, 'disability.percent')).toBeUndefined()
  })
})
