import type { FieldPath } from 'react-hook-form'
import {
  COURSE_CATEGORIES,
  GENDERS,
  INSTITUTION_TYPES,
  NATIONALITIES,
  PARENT_OCCUPATIONS,
  SOCIAL_CATEGORIES,
  STATE_CODES,
} from '@shared/constants'
import { PROFILE_KEYS } from '@shared/schemas'
import type { Profile, ProfileKey, ProfileUpdateBody } from '@shared/schemas'

type Common = {
  name: FieldPath<ProfileUpdateBody>
  /** Shows the "encrypted, used only for matching" note. */
  sensitive?: boolean
  /** When this returns false the field is hidden, and saved as cleared. */
  showIf?: (values: ProfileUpdateBody) => boolean
}

export type FieldDef = Common &
  (
    | { kind: 'hidden' | 'text' | 'date' | 'yesNo' | 'check' | 'disability' }
    | { kind: 'number'; inputMode: 'numeric' | 'decimal' }
    | { kind: 'select'; options: readonly string[]; optionsKey: string }
  )

export type StepDef = { id: string; fields: readonly FieldDef[] }

const select = (
  name: Common['name'],
  options: readonly string[],
  optionsKey: string = name,
): FieldDef => ({ kind: 'select', name, options, optionsKey })
const whole = (name: Common['name']): FieldDef => ({ kind: 'number', name, inputMode: 'numeric' })
const decimal = (name: Common['name']): FieldDef => ({ kind: 'number', name, inputMode: 'decimal' })
const yesNo = (name: Common['name']): FieldDef => ({ kind: 'yesNo', name })
const check = (name: Common['name']): FieldDef => ({ kind: 'check', name })

/** The wizard, in order. Labels come from `profile.fields.<name>` in the locale file. */
export const PROFILE_STEPS: readonly StepDef[] = [
  {
    id: 'education',
    fields: [
      { kind: 'hidden', name: 'educationLevel' },
      select('courseCategory', COURSE_CATEGORIES),
      { kind: 'text', name: 'courseName' },
      whole('yearOfStudy'),
      select('institutionState', STATE_CODES, 'state'),
      select('institutionType', INSTITUTION_TYPES),
    ],
  },
  {
    id: 'marks',
    fields: [
      decimal('class10Percent'),
      decimal('class12Percent'),
      decimal('cgpa'),
      decimal('attendancePercent'),
    ],
  },
  {
    id: 'family',
    fields: [
      { kind: 'number', name: 'familyIncome', inputMode: 'numeric', sensitive: true },
      select('parentOccupation', PARENT_OCCUPATIONS),
      yesNo('firstGenLearner'),
      yesNo('orphan'),
      yesNo('singleParent'),
      yesNo('defenceWard'),
      yesNo('hasOtherScholarship'),
      {
        kind: 'text',
        name: 'otherScholarshipName',
        showIf: (values) => values.hasOtherScholarship === true,
      },
    ],
  },
  {
    id: 'background',
    fields: [
      { ...select('category', SOCIAL_CATEGORIES), sensitive: true },
      yesNo('minority'),
      select('gender', GENDERS),
      { kind: 'disability', name: 'disability', sensitive: true },
      select('domicileState', STATE_CODES, 'state'),
      yesNo('rural'),
      select('nationality', NATIONALITIES),
      { kind: 'date', name: 'dateOfBirth' },
    ],
  },
  {
    id: 'documents',
    fields: [
      check('docs.incomeCertificate'),
      check('docs.casteCertificate'),
      check('docs.disabilityCertificate'),
      check('docs.domicileCertificate'),
      check('docs.bankAadhaarSeeded'),
      check('docs.class12Marksheet'),
      check('docs.feeReceipt'),
    ],
  },
]

/** The top-level profile keys a step saves (`docs.feeReceipt` → `docs`). */
export function stepKeys(step: StepDef): ProfileKey[] {
  return [...new Set(step.fields.map((field) => field.name.split('.')[0] as ProfileKey))]
}

/** Form values for a saved profile. `null` is a blank field, so a saved blank stays cleared. */
export function toFormValues(profile: Profile): ProfileUpdateBody {
  const values: Record<string, unknown> = {}
  for (const key of PROFILE_KEYS) values[key] = profile[key] ?? null
  return { ...values, educationLevel: 'UG', docs: profile.docs ?? {} } as ProfileUpdateBody
}

/** The partial PUT body for one step: only that step's fields, with hidden ones cleared. */
export function stepPayload(step: StepDef, values: ProfileUpdateBody): ProfileUpdateBody {
  const payload: Record<string, unknown> = {}
  for (const key of stepKeys(step)) payload[key] = values[key]
  for (const field of step.fields) {
    if (field.showIf && !field.showIf(values)) payload[field.name] = null
  }
  return payload as ProfileUpdateBody
}

/** Where to resume: the first step with nothing saved yet, or the start if all have something. */
export function resumeStepIndex(profile: Profile): number {
  const index = PROFILE_STEPS.findIndex((step) =>
    stepKeys(step)
      .filter((key) => key !== 'educationLevel')
      .every((key) => profile[key] === undefined),
  )
  return index === -1 ? 0 : index
}
