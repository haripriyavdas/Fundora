// English words for reason text. The client's own labels live in i18n/locales/en.json; these
// move to i18n keys when reasons are translated (docs/eligibility-engine.md).
import type {
  COURSE_CATEGORIES,
  INSTITUTION_TYPES,
  SOCIAL_CATEGORIES,
  STATE_CODES,
} from '../constants.js'
import type { ProfileField } from '../schemas/profile.js'

type FieldWords = {
  /** Mid-sentence name: "Your {label} is …". */
  label: string
  /** For "Add your {askFor} to your profile". Defaults to label (derived fields name their source). */
  askFor?: string
  /** Yes/no fields: who a "yes" describes, for "This scheme is only for {who}." */
  who?: string
  unit?: 'money' | 'percent' | 'years'
}

export const FIELD_WORDS: Record<ProfileField, FieldWords> = {
  educationLevel: { label: 'level of study' },
  courseCategory: { label: 'course' },
  courseName: { label: 'course name' },
  yearOfStudy: { label: 'year of study' },
  institutionState: { label: 'college state' },
  institutionType: { label: 'college type' },
  class10Percent: { label: 'Class 10 marks', unit: 'percent' },
  class12Percent: { label: 'Class 12 marks', unit: 'percent' },
  cgpa: { label: 'CGPA' },
  attendancePercent: { label: 'attendance', unit: 'percent' },
  familyIncome: { label: 'family income', unit: 'money' },
  parentOccupation: { label: "parent's occupation" },
  firstGenLearner: { label: 'first-generation learner', who: 'first-generation learners' },
  orphan: { label: 'orphan', who: 'orphans' },
  singleParent: { label: 'single parent', who: 'students with a single parent' },
  defenceWard: { label: 'defence ward', who: 'children of defence personnel' },
  category: { label: 'category' },
  minority: { label: 'minority community', who: 'students from a minority community' },
  gender: { label: 'gender' },
  domicileState: { label: 'home state' },
  rural: { label: 'rural area', who: 'students from rural areas' },
  nationality: { label: 'nationality' },
  dateOfBirth: { label: 'date of birth' },
  hasOtherScholarship: {
    label: 'other scholarship',
    who: 'students who already get another scholarship',
  },
  otherScholarshipName: { label: 'other scholarship name' },
  'disability.has': { label: 'disability', who: 'students with a disability' },
  'disability.percent': { label: 'disability percentage', unit: 'percent' },
  'docs.incomeCertificate': {
    label: 'income certificate',
    who: 'students with an income certificate',
  },
  'docs.casteCertificate': { label: 'caste certificate', who: 'students with a caste certificate' },
  'docs.disabilityCertificate': {
    label: 'disability certificate',
    who: 'students with a disability certificate',
  },
  'docs.domicileCertificate': {
    label: 'domicile certificate',
    who: 'students with a domicile certificate',
  },
  'docs.bankAadhaarSeeded': {
    label: 'Aadhaar-linked bank account',
    who: 'students whose bank account is linked to Aadhaar',
  },
  'docs.class12Marksheet': {
    label: 'Class 12 marks card',
    who: 'students with their Class 12 marks card',
  },
  'docs.feeReceipt': { label: 'fee receipt', who: 'students with a fee receipt' },
  age: { label: 'age', askFor: 'date of birth', unit: 'years' },
  isFinalYear: {
    label: 'final year',
    askFor: 'course and year of study',
    who: 'final-year students',
  },
}

export const COURSE_NAMES: Record<(typeof COURSE_CATEGORIES)[number], string> = {
  arts: 'Arts',
  science: 'Science',
  commerce: 'Commerce',
  management: 'Management',
  'computer-it': 'Computer / IT',
  engineering: 'Engineering',
  medicine: 'Medicine',
  dental: 'Dental',
  pharmacy: 'Pharmacy',
  architecture: 'Architecture',
  agriculture: 'Agriculture',
  nursing: 'Nursing',
  paramedical: 'Paramedical',
  law: 'Law',
  education: 'Education',
  'design-fine-arts': 'Design / Fine Arts',
  'hotel-management': 'Hotel Management',
  'social-sciences': 'Social Sciences',
  vocational: 'Vocational / Professional',
}

export const STATE_NAMES: Record<(typeof STATE_CODES)[number], string> = {
  AN: 'Andaman and Nicobar Islands',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DL: 'Delhi',
  DN: 'Dadra and Nagar Haveli and Daman and Diu',
  GA: 'Goa',
  GJ: 'Gujarat',
  HP: 'Himachal Pradesh',
  HR: 'Haryana',
  JH: 'Jharkhand',
  JK: 'Jammu and Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  TS: 'Telangana',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
}

export const CATEGORY_NAMES: Record<(typeof SOCIAL_CATEGORIES)[number], string> = {
  GEN: 'General category',
  OBC: 'OBC',
  SC: 'SC',
  ST: 'ST',
  EWS: 'EWS',
}

export const INSTITUTION_NAMES: Record<(typeof INSTITUTION_TYPES)[number], string> = {
  govt: 'government',
  aided: 'government-aided',
  private: 'private',
}
