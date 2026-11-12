import { model, Schema } from 'mongoose'

/**
 * One student's match results for every active scheme, so lists don't re-run the engine on every
 * request. Valid while profileVersion, dataVersion and the day (age and closing dates change
 * with it) all match. The results are encrypted: a state or reason can reveal income, category
 * or disability.
 */
const matchResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profileVersion: { type: Number, required: true },
    dataVersion: { type: Number, required: true },
    /** The India date (YYYY-MM-DD) the results were computed for. */
    computedFor: { type: String, required: true },
    /** encrypt([{ schemeId, state, score, reason, reasons }]) */
    results: { type: String, required: true },
    computedAt: { type: Date, required: true },
  },
  { timestamps: false, strict: true },
)

// Stale caches clean themselves up
matchResultSchema.index({ computedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const MatchResultModel = model('MatchResult', matchResultSchema, 'matchResults')
