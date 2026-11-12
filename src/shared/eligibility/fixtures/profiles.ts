import type { ProfileFields } from '../../schemas/profile.js'

// Made-up students for tests and `npm run check-scheme`. Never put a real student's data here.

/** Fits _example.json fully: first-year engineering girl, low income, good marks. */
export const meera: ProfileFields = {
  educationLevel: 'UG',
  courseCategory: 'engineering',
  courseName: 'B.E. Computer Science',
  yearOfStudy: 1,
  institutionState: 'KA',
  institutionType: 'govt',
  class10Percent: 88,
  class12Percent: 82,
  attendancePercent: 90,
  familyIncome: 180000,
  parentOccupation: 'farmer',
  firstGenLearner: true,
  category: 'OBC',
  gender: 'female',
  disability: { has: false },
  domicileState: 'KA',
  rural: true,
  nationality: 'indian',
  dateOfBirth: '2007-03-14',
  hasOtherScholarship: false,
  docs: { incomeCertificate: true, casteCertificate: true, class12Marksheet: true },
}

/** Like Meera, but income ₹20,000 over the limit and marks 2% short: two near misses. */
export const anjali: ProfileFields = {
  ...meera,
  familyIncome: 320000,
  class12Percent: 58,
  rural: false,
}

/** Male, so a hard rule fails whatever else fits. */
export const rahul: ProfileFields = {
  ...meera,
  gender: 'male',
  rural: false,
}

/** Hasn't filled gender (a hard rule) yet. */
export const priya: ProfileFields = (() => {
  const { gender: _gender, ...rest } = meera
  return rest
})()

/** Fits the hard rules but income is far over the limit. */
export const kavya: ProfileFields = {
  ...meera,
  familyIncome: 900000,
}

/** Only the first wizard step done: course and year, nothing else. */
export const newStudent: ProfileFields = {
  educationLevel: 'UG',
  courseCategory: 'engineering',
  yearOfStudy: 1,
}

export const SAMPLE_PROFILES = { meera, anjali, rahul, priya, kavya, newStudent }
