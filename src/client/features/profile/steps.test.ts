import { describe, expect, it } from 'vitest'
import { PROFILE_KEYS, ProfileUpdateBody, STORED_PROFILE_FIELDS } from '@shared/schemas'
import en from '../../i18n/locales/en.json'
import {
  PROFILE_STEPS,
  resumeStepIndex,
  stepKeys,
  stepPayload,
  toFormValues,
  type StepDef,
} from './steps'

const stepById = (id: string) => PROFILE_STEPS.find((step) => step.id === id) as StepDef

/** Reads `a.b.c` from the locale file. */
function lookup(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], en)
}

describe('profile steps', () => {
  it('has exactly 5 steps in the documented order', () => {
    expect(PROFILE_STEPS.map((step) => step.id)).toEqual([
      'education',
      'marks',
      'family',
      'background',
      'documents',
    ])
  })

  it('asks every profile field in exactly one step', () => {
    const asked = PROFILE_STEPS.flatMap(stepKeys)
    expect([...asked].sort()).toEqual([...PROFILE_KEYS].sort())
  })

  it('asks every stored field a rule can test', () => {
    const named = PROFILE_STEPS.flatMap((step) => step.fields.map((field) => field.name))
    for (const field of STORED_PROFILE_FIELDS) {
      expect(named).toContain(field.startsWith('disability.') ? 'disability' : field)
    }
  })

  it('has English text for every step, label and option', () => {
    for (const step of PROFILE_STEPS) {
      expect(lookup(`profile.steps.${step.id}.title`)).toEqual(expect.any(String))
      for (const field of step.fields) {
        if (field.kind === 'hidden') continue
        expect(lookup(`profile.fields.${field.name}.label`), field.name).toEqual(expect.any(String))
        if (field.kind !== 'select') continue
        for (const option of field.options) {
          const path = `profile.options.${field.optionsKey}.${option}`
          expect(lookup(path), path).toEqual(expect.any(String))
        }
      }
    }
  })
})

describe('toFormValues', () => {
  it('produces values the API schema accepts for an empty profile', () => {
    expect(ProfileUpdateBody.safeParse(toFormValues({ profileVersion: 0 })).success).toBe(true)
  })

  it('always sets the level to UG and keeps saved answers', () => {
    const values = toFormValues({ profileVersion: 2, cgpa: 0, rural: false })
    expect(values).toMatchObject({ educationLevel: 'UG', cgpa: 0, rural: false, courseName: null })
  })

  it('does not send profileVersion', () => {
    expect(toFormValues({ profileVersion: 2 })).not.toHaveProperty('profileVersion')
  })
})

describe('stepPayload', () => {
  const values = toFormValues({ profileVersion: 1, cgpa: 8, courseName: 'B.Sc' })

  it('only sends the fields of that step', () => {
    expect(stepPayload(stepById('marks'), values)).toEqual({
      class10Percent: null,
      class12Percent: null,
      cgpa: 8,
      attendancePercent: null,
    })
  })

  it('includes the level with the education step', () => {
    expect(stepPayload(stepById('education'), values).educationLevel).toBe('UG')
  })

  it('clears the scholarship name when the student has no other scholarship', () => {
    const family = stepById('family')
    const withName = { ...values, hasOtherScholarship: false, otherScholarshipName: 'Old' }
    expect(stepPayload(family, withName).otherScholarshipName).toBeNull()
    const kept = { ...withName, hasOtherScholarship: true }
    expect(stepPayload(family, kept).otherScholarshipName).toBe('Old')
  })

  it('every step payload passes the API schema', () => {
    for (const step of PROFILE_STEPS) {
      const payload = stepPayload(step, toFormValues({ profileVersion: 0 }))
      expect(ProfileUpdateBody.safeParse(payload).success, step.id).toBe(true)
    }
  })
})

describe('resumeStepIndex', () => {
  it('starts at the beginning for a new student', () => {
    expect(resumeStepIndex({ profileVersion: 0 })).toBe(0)
  })

  it('ignores the level, which is saved automatically', () => {
    expect(resumeStepIndex({ profileVersion: 1, educationLevel: 'UG' })).toBe(0)
  })

  it('resumes at the first step with nothing saved', () => {
    expect(resumeStepIndex({ profileVersion: 1, courseName: 'B.Sc', cgpa: 8 })).toBe(2)
  })

  it('goes back to the start when every step has something', () => {
    expect(
      resumeStepIndex({
        profileVersion: 5,
        courseName: 'B.Sc',
        cgpa: 8,
        rural: false,
        orphan: false,
        docs: { feeReceipt: false },
      }),
    ).toBe(0)
  })
})
