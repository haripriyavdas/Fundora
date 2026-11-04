// Fixed value lists shared by the profile, scheme files and the UI. Display names live in i18n.

export const COURSE_CATEGORIES = [
  'arts',
  'science',
  'commerce',
  'management',
  'computer-it',
  'engineering',
  'medicine',
  'dental',
  'pharmacy',
  'architecture',
  'agriculture',
  'nursing',
  'paramedical',
  'law',
  'education',
  'design-fine-arts',
  'hotel-management',
  'social-sciences',
  'vocational',
] as const

/** The 28 states and 8 union territories. Scheme files use these codes in `states`. */
export const STATE_CODES = [
  'AN',
  'AP',
  'AR',
  'AS',
  'BR',
  'CG',
  'CH',
  'DL',
  'DN',
  'GA',
  'GJ',
  'HP',
  'HR',
  'JH',
  'JK',
  'KA',
  'KL',
  'LA',
  'LD',
  'MH',
  'ML',
  'MN',
  'MP',
  'MZ',
  'NL',
  'OD',
  'PB',
  'PY',
  'RJ',
  'SK',
  'TN',
  'TR',
  'TS',
  'UK',
  'UP',
  'WB',
] as const

export const SOCIAL_CATEGORIES = ['GEN', 'OBC', 'SC', 'ST', 'EWS'] as const
export const INSTITUTION_TYPES = ['govt', 'aided', 'private'] as const
export const GENDERS = ['female', 'male', 'other'] as const
export const NATIONALITIES = ['indian', 'other'] as const

/** A fixed list, not free text: scheme rules can only match values they can name. */
export const PARENT_OCCUPATIONS = [
  'farmer',
  'labourer',
  'construction-worker',
  'beedi-cine-mine-worker',
  'government',
  'private-job',
  'self-employed',
  'homemaker',
  'unemployed',
  'other',
] as const
