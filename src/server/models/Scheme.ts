import { model, Schema, type InferSchemaType } from 'mongoose'

// Written only by scripts/seed.ts from data/schemes, after SchemeFileSchema has validated each file.
// The app only reads this collection. Nested display fields are stored as they are in the file.
const schemeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    provider: { type: String, required: true },
    providerType: { type: String, required: true },
    aidType: { type: String, required: true },
    level: { type: String, required: true },
    courses: { type: [String], required: true },
    states: { type: [String], required: true },
    groups: [String],

    amount: { type: String, required: true },
    amountMax: Number,
    opensOn: String, // YYYY-MM-DD
    closesOn: String, // YYYY-MM-DD; null = open all year
    mode: { type: String, required: true },
    portal: { name: String, url: String },
    sourceUrl: { type: String, required: true },
    verifiedOn: { type: String, required: true },

    about: String,
    benefits: [String],
    eligibilityText: [String],

    rules: { type: [Schema.Types.Mixed], required: true },
    renewal: Schema.Types.Mixed,
    documents: [Schema.Types.Mixed],
    steps: [Schema.Types.Mixed],
    offline: Schema.Types.Mixed,
    officialDocuments: [Schema.Types.Mixed],
    importantDates: [Schema.Types.Mixed],
    helpline: Schema.Types.Mixed,
    notes: [String],

    // Set by the seed
    status: { type: String, enum: ['active', 'retired'], required: true },
    dataVersion: { type: Number, required: true },
    /** SHA-256 of the file's content, so a re-seed can tell which schemes really changed. */
    contentHash: { type: String, required: true },
    seededAt: { type: Date, required: true },
  },
  { timestamps: true, strict: true, minimize: false },
)

// courses and states are both arrays, and MongoDB can't put two arrays in one index
schemeSchema.index({ status: 1, level: 1, courses: 1 })
schemeSchema.index({ status: 1, states: 1 })
schemeSchema.index({ closesOn: 1 })
schemeSchema.index({ name: 'text', provider: 'text', about: 'text' })

export type SchemeDoc = InferSchemaType<typeof schemeSchema>

export const Scheme = model('Scheme', schemeSchema)
