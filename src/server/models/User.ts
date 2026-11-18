import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose'
import type { PublicUser } from '../../shared/schemas/index.js'

// Students are the only users. There is deliberately no `role` field.
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String },
    verified: { type: Boolean, required: true, default: false },
    consentAt: { type: Date, required: true },
    // Reminder email settings (GET/PATCH /notifications/settings)
    deadlineEmails: { type: Boolean, required: true, default: true },
    renewalEmails: { type: Boolean, required: true, default: true },
    // One-time tokens are stored only as SHA-256 hashes (services/tokens.ts)
    verifyTokenHash: { type: String, select: false },
    verifyTokenExpiresAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true, strict: true },
)

userSchema.index({ googleId: 1 }, { unique: true, sparse: true })
userSchema.index({ verifyTokenHash: 1 }, { sparse: true })
userSchema.index({ resetTokenHash: 1 }, { sparse: true })

export type UserFields = InferSchemaType<typeof userSchema>
export type UserDoc = HydratedDocument<UserFields>

export const User = model('User', userSchema)

export function toPublicUser(user: UserDoc): PublicUser {
  return { id: user.id, email: user.email, verified: user.verified }
}
