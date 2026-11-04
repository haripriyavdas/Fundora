import { z } from 'zod'
import {
  COURSE_CATEGORIES,
  GENDERS,
  INSTITUTION_TYPES,
  NATIONALITIES,
  PARENT_OCCUPATIONS,
  SOCIAL_CATEGORIES,
  STATE_CODES,
} from '../constants.js'

const choose = { error: 'Please choose one of the options.' }
const answer = { error: 'Please answer yes or no.' }

const percent = () => {
  const error = 'Enter a number from 0 to 100.'
  return z.number({ error }).min(0, { error }).max(100, { error })
}

const shortText = () => {
  const error = 'Use between 1 and 120 characters.'
  return z.string({ error }).trim().min(1, { error }).max(120, { error })
}

const yesNo = () => z.boolean(answer)

const DateOfBirth = z.iso
  .date({ error: 'Enter your date of birth.' })
  .refine((d) => d >= '1940-01-01' && d <= new Date().toISOString().slice(0, 10), {
    error: 'Enter your real date of birth.',
  })

const DisabilitySchema = z
  .strictObject({
    has: yesNo(),
    percent: percent().optional(),
  })
  .refine((d) => d.has || d.percent === undefined, {
    error: 'Only add a percentage if you have a disability.',
    path: ['percent'],
  })

// Documents are yes/no flags. Never add a field here that holds an ID or account number.
const DocsSchema = z
  .strictObject({
    incomeCertificate: yesNo(),
    casteCertificate: yesNo(),
    disabilityCertificate: yesNo(),
    domicileCertificate: yesNo(),
    bankAadhaarSeeded: yesNo(),
    class12Marksheet: yesNo(),
    feeReceipt: yesNo(),
  })
  .partial()

const fields = {
  // Education
  educationLevel: z.literal('UG', choose),
  courseCategory: z.enum(COURSE_CATEGORIES, choose),
  courseName: shortText(),
  yearOfStudy: z
    .number({ error: 'Enter a year from 1 to 5.' })
    .int({ error: 'Enter a year from 1 to 5.' })
    .min(1, { error: 'Enter a year from 1 to 5.' })
    .max(5, { error: 'Enter a year from 1 to 5.' }),
  institutionState: z.enum(STATE_CODES, choose),
  institutionType: z.enum(INSTITUTION_TYPES, choose),
  // Marks
  class10Percent: percent(),
  class12Percent: percent(),
  cgpa: z
    .number({ error: 'Enter a CGPA from 0 to 10.' })
    .min(0, { error: 'Enter a CGPA from 0 to 10.' })
    .max(10, { error: 'Enter a CGPA from 0 to 10.' }),
  attendancePercent: percent(),
  // Family
  familyIncome: z
    .number({ error: 'Enter the yearly amount in rupees.' })
    .int({ error: 'Enter whole rupees, without paise.' })
    .min(0, { error: 'Enter the yearly amount in rupees.' })
    .max(10_000_000_000, { error: 'That amount looks too large. Please check it.' }),
  parentOccupation: z.enum(PARENT_OCCUPATIONS, choose),
  firstGenLearner: yesNo(),
  orphan: yesNo(),
  singleParent: yesNo(),
  defenceWard: yesNo(),
  // Background
  category: z.enum(SOCIAL_CATEGORIES, choose),
  minority: yesNo(),
  gender: z.enum(GENDERS, choose),
  disability: DisabilitySchema,
  domicileState: z.enum(STATE_CODES, choose),
  rural: yesNo(),
  nationality: z.enum(NATIONALITIES, choose),
  dateOfBirth: DateOfBirth,
  // Current aid
  hasOtherScholarship: yesNo(),
  otherScholarshipName: shortText(),
  // Documents held
  docs: DocsSchema,
}

type Fields = typeof fields

/** Every field a student can fill. All optional, because the wizard saves one step at a time. */
export const ProfileFieldsSchema = z.object(fields).partial()

/** GET and PUT /profile response. Decrypted, and only ever sent to the student who owns it. */
export const ProfileSchema = ProfileFieldsSchema.extend({
  /** +1 on every save; 0 until the first save. The match cache keys on this. */
  profileVersion: z.number().int().min(0),
})

/**
 * PUT /profile body. A missing field stays as it is; `null` clears it. Strict, so unknown keys
 * (`aadhaarNumber`, `role`, `userId`, `profileVersion`) get a 400 instead of being dropped.
 */
export const ProfileUpdateBody = z.strictObject(
  Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [key, schema.nullable().optional()]),
  ) as { [K in keyof Fields]: z.ZodOptional<z.ZodNullable<Fields[K]>> },
)

/** Top-level keys of the profile, in the order the wizard asks for them. */
export const PROFILE_KEYS = Object.keys(fields) as (keyof Fields)[]

/** Stored encrypted (services/crypto.ts). They can't be queried; matching runs in Node. */
export const SENSITIVE_PROFILE_KEYS = ['familyIncome', 'category', 'disability'] as const

/** Everything a stored profile can hold, in the dotted form scheme rules use. */
export const STORED_PROFILE_FIELDS = [
  ...PROFILE_KEYS.filter((key) => key !== 'disability' && key !== 'docs'),
  'disability.has',
  'disability.percent',
  ...(Object.keys(DocsSchema.shape) as (keyof typeof DocsSchema.shape)[]).map(
    (doc) => `docs.${doc}` as const,
  ),
] as const

/** Computed before evaluating and never stored (docs/eligibility-engine.md). */
export const DERIVED_PROFILE_FIELDS = ['age', 'isFinalYear'] as const

/** The fields scheme rules may test. */
export const PROFILE_FIELDS = [...STORED_PROFILE_FIELDS, ...DERIVED_PROFILE_FIELDS] as const

export type ProfileFields = z.infer<typeof ProfileFieldsSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type ProfileUpdateBody = z.infer<typeof ProfileUpdateBody>
export type ProfileKey = (typeof PROFILE_KEYS)[number]
export type ProfileField = (typeof PROFILE_FIELDS)[number]
