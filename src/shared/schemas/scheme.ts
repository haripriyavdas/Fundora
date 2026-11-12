import { z } from 'zod'
import { COURSE_CATEGORIES, STATE_CODES } from '../constants.js'
import { MatchSummarySchema, RuleReasonSchema } from './match.js'
import { RuleSchema } from './rule.js'

// Value lists for scheme files (docs/scheme-data.md)
export const PROVIDER_TYPES = ['central', 'state', 'private', 'bank'] as const
export const AID_TYPES = [
  'scholarship',
  'loan',
  'feeWaiver',
  'device',
  'hostel',
  'books',
  'coaching',
  'travel',
] as const
export const SCHEME_GROUPS = ['girls', 'disability', 'rural'] as const
export const SCHEME_MODES = ['online', 'onlineAndOffline'] as const

const text = (max = 300) => z.string().trim().min(1).max(max)
const date = () => z.iso.date({ error: 'Use a YYYY-MM-DD date.' })
// Portals, sources and documents must be https, so a student is never sent to a plain-http page
const httpsUrl = () =>
  z.url({ protocol: /^https$/, hostname: z.regexes.domain, error: 'Use a full https:// link.' })

/** `["ALL"]` on its own, or a list of specific values. */
const allOr = <T extends readonly [string, ...string[]]>(values: T, what: string) =>
  z
    .array(z.enum(['ALL', ...values], { error: `Use "ALL" or valid ${what}.` }))
    .min(1)
    .refine((list) => !list.includes('ALL') || list.length === 1, {
      error: `"ALL" has to be the only value in the list.`,
    })
    .refine((list) => new Set(list).size === list.length, { error: 'Remove the repeated value.' })

/** The same id style as file names: lowercase words joined by hyphens. */
export const SchemeIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'Use lowercase words joined by hyphens.' })
  .max(80)

const SchemeFileFields = z.strictObject({
  id: SchemeIdSchema,
  name: text(150),
  provider: text(150),
  providerType: z.enum(PROVIDER_TYPES),
  aidType: z.enum(AID_TYPES),
  level: z.literal('UG'),
  courses: allOr(COURSE_CATEGORIES, 'course categories'),
  states: allOr(STATE_CODES, 'state codes'),
  groups: z.array(z.enum(SCHEME_GROUPS)).optional(),

  amount: text(100),
  amountMax: z.number().int().positive().optional(),
  opensOn: date().optional(),
  /** `null` means open all year. Left out means the date isn't known yet. */
  closesOn: date().nullable().optional(),
  mode: z.enum(SCHEME_MODES),
  portal: z.strictObject({ name: text(150), url: httpsUrl() }),
  sourceUrl: httpsUrl(),
  verifiedOn: date(),

  about: text(1000).optional(),
  benefits: z.array(text()).optional(),
  eligibilityText: z.array(text()).optional(),

  rules: z.array(RuleSchema).min(1, { error: 'Add at least one rule.' }),
  renewal: z
    .strictObject({
      minAttendancePercent: z.number().min(0).max(100).optional(),
      minCgpa: z.number().min(0).max(10).optional(),
      text: text(500),
    })
    .optional(),

  documents: z
    .array(z.strictObject({ id: SchemeIdSchema, name: text(150), note: text().optional() }))
    .min(1),
  steps: z.array(z.strictObject({ title: text(100), text: text(600) })).min(1),
  offline: z
    .strictObject({
      summary: text(),
      where: text(),
      when: text(),
      carry: z.array(text()).min(1),
      tip: text().optional(),
    })
    .nullable()
    .optional(),
  officialDocuments: z
    .array(
      z.strictObject({
        title: text(200),
        kind: text(50),
        format: text(20),
        url: httpsUrl(),
        publishedOn: date().optional(),
      }),
    )
    .optional(),
  importantDates: z.array(z.strictObject({ label: text(100), date: date() })).optional(),
  helpline: z
    .strictObject({
      phone: text(40).optional(),
      email: z.email().optional(),
      hours: text(100).optional(),
    })
    .optional(),
  /** Internal notes for the team. Never sent to students. */
  notes: z.array(text(1000)).optional(),
})

/** One file in data/schemes. Only `npm run seed` writes these to the database. */
export const SchemeFileSchema = SchemeFileFields.superRefine((scheme, ctx) => {
  if (scheme.mode === 'onlineAndOffline' && !scheme.offline) {
    ctx.addIssue({
      code: 'custom',
      path: ['offline'],
      message: 'Describe the offline step when mode is onlineAndOffline.',
    })
  }
  if (scheme.opensOn && scheme.closesOn && scheme.opensOn > scheme.closesOn) {
    ctx.addIssue({ code: 'custom', path: ['closesOn'], message: 'closesOn is before opensOn.' })
  }
  const docIds = scheme.documents.map((d) => d.id)
  docIds.forEach((id, i) => {
    if (docIds.indexOf(id) !== i) {
      ctx.addIssue({
        code: 'custom',
        path: ['documents', i, 'id'],
        message: `Document id "${id}" is used twice.`,
      })
    }
  })
})

export type SchemeFile = z.infer<typeof SchemeFileSchema>

/**
 * A scheme as the API sends it (docs/api.md): the file minus `rules` and the team's `notes`,
 * plus whether it's open today and how the student matches.
 */
export const SchemeSchema = z.object({
  ...SchemeFileFields.omit({ rules: true, notes: true }).shape,
  isOpen: z.boolean(),
  match: MatchSummarySchema,
  /** Detail route only, for a signed-in student: every rule explained. */
  eligibility: z.array(RuleReasonSchema).optional(),
})

export const SCHEME_SORTS = ['match', 'closing', 'amount', 'name'] as const

/** GET /schemes query. Unknown keys are ignored; bad values get a 400. */
export const SchemesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  aidType: z.enum(AID_TYPES).optional(),
  providerType: z.enum(PROVIDER_TYPES).optional(),
  group: z.enum(SCHEME_GROUPS).optional(),
  state: z.enum(STATE_CODES).optional(),
  openOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  /** Defaults to `match` when signed in, `closing` otherwise. */
  sort: z.enum(SCHEME_SORTS).optional(),
})

export const SchemeParams = z.strictObject({ id: SchemeIdSchema })

export type Scheme = z.infer<typeof SchemeSchema>
export type SchemeSort = (typeof SCHEME_SORTS)[number]
export type SchemesQuery = z.infer<typeof SchemesQuery>
