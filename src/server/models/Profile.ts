import { model, Schema } from 'mongoose'

// Value rules live in ProfileUpdateBody (src/shared/schemas/profile.ts), the only way data gets in.
// Never add Aadhaar, bank account, ID numbers or portal passwords here.
const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // No default: the first save's $inc takes it from nothing to 1
    profileVersion: { type: Number },

    educationLevel: String,
    courseCategory: String,
    courseName: String,
    yearOfStudy: Number,
    institutionState: String,
    institutionType: String,

    class10Percent: Number,
    class12Percent: Number,
    cgpa: Number,
    attendancePercent: Number,

    familyIncome: String, // encrypted
    parentOccupation: String,
    firstGenLearner: Boolean,
    orphan: Boolean,
    singleParent: Boolean,
    defenceWard: Boolean,

    category: String, // encrypted
    minority: Boolean,
    gender: String,
    disability: String, // encrypted, as JSON { has, percent? }
    domicileState: String,
    rural: Boolean,
    nationality: String,
    dateOfBirth: String, // YYYY-MM-DD

    hasOtherScholarship: Boolean,
    otherScholarshipName: String,

    docs: {
      incomeCertificate: Boolean,
      casteCertificate: Boolean,
      disabilityCertificate: Boolean,
      domicileCertificate: Boolean,
      bankAadhaarSeeded: Boolean,
      class12Marksheet: Boolean,
      feeReceipt: Boolean,
    },
  },
  { timestamps: true, strict: true },
)

export const ProfileModel = model('Profile', profileSchema)
