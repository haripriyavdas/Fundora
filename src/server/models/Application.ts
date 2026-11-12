import { model, Schema, type InferSchemaType } from 'mongoose'
import { SAVED_STAGES } from '../../shared/schemas/index.js'

/** A scheme in a student's tracker. API path `/saved`. Stages are exactly saved | applied | renewal_due. */
const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    schemeId: { type: String, required: true },
    stage: { type: String, enum: SAVED_STAGES, required: true },
    savedOn: { type: Date, required: true },
    appliedOn: { type: Date },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true, strict: true },
)

applicationSchema.index({ userId: 1, schemeId: 1 }, { unique: true })

export type ApplicationFields = InferSchemaType<typeof applicationSchema>

export const Application = model('Application', applicationSchema)
