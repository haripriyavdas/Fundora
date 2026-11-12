import { model, Schema, type InferSchemaType } from 'mongoose'

export const NOTIFICATION_KINDS = ['deadline', 'renewal'] as const

/**
 * A reminder email waiting to go out (or already sent). Created when a scheme is saved and by the
 * daily reminders job; the job claims each one by setting `sentAt`, so running it twice is safe.
 */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    schemeId: { type: String, required: true },
    kind: { type: String, enum: NOTIFICATION_KINDS, required: true },
    /** Deadline reminders: 14, 7 or 1. */
    daysBefore: { type: Number },
    sendAt: { type: Date, required: true },
    sentAt: { type: Date },
    /** Set with sentAt when the reminder no longer applied (applied already, date moved, emails off). */
    skipped: { type: Boolean },
  },
  { timestamps: true, strict: true },
)

notificationSchema.index({ sentAt: 1, sendAt: 1 })
notificationSchema.index({ userId: 1 })
// The same reminder can't be created twice, so creating them is safe to repeat
notificationSchema.index({ userId: 1, schemeId: 1, kind: 1, sendAt: 1 }, { unique: true })

export type NotificationFields = InferSchemaType<typeof notificationSchema>

export const Notification = model('Notification', notificationSchema)
