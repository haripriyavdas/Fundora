import { z } from 'zod'
import { SchemeIdSchema } from './scheme.js'

/** The tracker has exactly these three stages (CLAUDE.md hard rule 4). */
export const SAVED_STAGES = ['saved', 'applied', 'renewal_due'] as const

const date = () => z.iso.date()

/** One scheme in the student's tracker (`applications` collection, API path `/saved`). */
export const SavedSchemeSchema = z.object({
  schemeId: SchemeIdSchema,
  stage: z.enum(SAVED_STAGES),
  /** India dates, YYYY-MM-DD. */
  savedOn: date(),
  appliedOn: date().optional(),
  notes: z.string().optional(),
})

/** POST /saved */
export const SaveSchemeBody = z.strictObject({ schemeId: SchemeIdSchema })

/** PATCH /saved/:schemeId. `notes: null` clears the note. */
export const UpdateSavedBody = z
  .strictObject({
    stage: z.enum(SAVED_STAGES, { error: 'Use saved, applied or renewal_due.' }).optional(),
    notes: z
      .string()
      .trim()
      .max(500, { error: 'Keep notes under 500 characters.' })
      .nullable()
      .optional(),
  })
  .refine((body) => body.stage !== undefined || body.notes !== undefined, {
    error: 'Send a stage or notes.',
  })

export const SavedParams = z.strictObject({ schemeId: SchemeIdSchema })

/** GET and PATCH /notifications/settings */
export const NotificationSettingsSchema = z.object({
  deadlineEmails: z.boolean(),
  renewalEmails: z.boolean(),
})
export const NotificationSettingsBody = z
  .strictObject({ deadlineEmails: z.boolean(), renewalEmails: z.boolean() })
  .partial()

export type SavedStage = (typeof SAVED_STAGES)[number]
export type SavedScheme = z.infer<typeof SavedSchemeSchema>
export type SaveSchemeBody = z.infer<typeof SaveSchemeBody>
export type UpdateSavedBody = z.infer<typeof UpdateSavedBody>
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>
export type NotificationSettingsBody = z.infer<typeof NotificationSettingsBody>
