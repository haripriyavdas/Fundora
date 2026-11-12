import type { ProfileField } from '../schemas/profile.js'
import type { Rule } from '../schemas/rule.js'
import type { Check } from './operators.js'
import {
  CATEGORY_NAMES,
  COURSE_NAMES,
  FIELD_WORDS,
  INSTITUTION_NAMES,
  STATE_NAMES,
} from './labels.js'

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth']
const GENDER_WHO: Record<string, string> = {
  female: 'girls and women',
  male: 'boys and men',
  other: 'students of other genders',
}
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lookup = (names: Record<string, string>, v: unknown) => names[String(v)] ?? String(v)

/** ₹2,50,000 style. */
export const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(n)}`

/** A number in the field's unit: ₹ for money, % for marks, years for age. */
export function formatAmount(field: ProfileField, n: number): string {
  switch (FIELD_WORDS[field].unit) {
    case 'money':
      return rupees(n)
    case 'percent':
      return `${n}%`
    case 'years':
      return `${n} ${n === 1 ? 'year' : 'years'}`
    default:
      return String(n)
  }
}

/** A value as words: "Engineering", "Karnataka", "yes". */
function valueWords(field: ProfileField, v: unknown): string {
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number') return formatAmount(field, v)
  switch (field) {
    case 'courseCategory':
      return lookup(COURSE_NAMES, v)
    case 'domicileState':
    case 'institutionState':
      return lookup(STATE_NAMES, v)
    case 'category':
      return lookup(CATEGORY_NAMES, v)
    case 'institutionType':
      return lookup(INSTITUTION_NAMES, v)
    default:
      return String(v).replaceAll('-', ' ')
  }
}

/** The students a value describes, for "only for …" lines. Undefined when there's no natural phrase. */
function whoHas(field: ProfileField, v: unknown): string | undefined {
  if (typeof v === 'boolean') return v ? FIELD_WORDS[field].who : undefined
  switch (field) {
    case 'gender':
      return GENDER_WHO[String(v)]
    case 'courseCategory':
      return `${valueWords(field, v)} students`
    case 'yearOfStudy':
      return typeof v === 'number' && ORDINALS[v - 1]
        ? `${ORDINALS[v - 1]}-year students`
        : undefined
    case 'category':
      return `${valueWords(field, v)} students`
    case 'institutionType':
      return `students at ${valueWords(field, v)} colleges`
    case 'domicileState':
      return `students from ${valueWords(field, v)}`
    case 'institutionState':
      return `students studying in ${valueWords(field, v)}`
    case 'nationality':
      return v === 'indian' ? 'Indian citizens' : undefined
    default:
      return undefined
  }
}

const orList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`

const values = (rule: Rule) => (Array.isArray(rule.value) ? rule.value : [rule.value])

/** What a rule asks for, in a few words: "Family income up to ₹3,00,000". Uses the rule's label if set. */
export function describeRule(rule: Rule): string {
  if (rule.label) return rule.label
  const { field } = rule
  const label = capitalise(FIELD_WORDS[field].label)
  const words = () => orList(values(rule).map((v) => valueWords(field, v)))
  // "For girls and women" reads better than "Gender: female", when every value has a phrase
  const forWho = () => {
    const who = values(rule).map((v) => whoHas(field, v))
    return who.every(Boolean) ? `For ${orList(who as string[])}` : `${label}: ${words()}`
  }

  switch (rule.op) {
    case 'eq':
      if (rule.value === false && FIELD_WORDS[field].who) return `Not for ${FIELD_WORDS[field].who}`
      return forWho()
    case 'in':
      return forWho()
    case 'notIn':
      return `${label}: not ${words()}`
    case 'lte':
      return `${label} up to ${formatAmount(field, rule.value as number)}`
    case 'gte':
      return `${label} at least ${formatAmount(field, rule.value as number)}`
    case 'between': {
      const [min, max] = rule.value as [number, number]
      return `${label} from ${formatAmount(field, min)} to ${formatAmount(field, max)}`
    }
    case 'exists':
      return `${label} given`
    case 'isTrue':
      return `For ${FIELD_WORDS[field].who ?? FIELD_WORDS[field].label}`
  }
}

/** "Add your family income to your profile to check this." */
export function unknownText(field: ProfileField): string {
  const words = FIELD_WORDS[field]
  return `Add your ${words.askFor ?? words.label} to your profile to check this.`
}

/** The card line when a hard rule can't be checked: "Add your category to check this scheme." */
export function unknownCardText(field: ProfileField): string {
  const words = FIELD_WORDS[field]
  return `Add your ${words.askFor ?? words.label} to check this scheme.`
}

/** One plain-language line for a rule the student's value was checked against. */
export function checkText(rule: Rule, check: Check, value: unknown): string {
  if (check.result === 'met') return `${describeRule(rule)}: you meet this.`

  const { field } = rule
  const label = FIELD_WORDS[field].label
  const amount = (n: number) => formatAmount(field, n)
  const gap = check.gap ?? 0

  switch (rule.op) {
    case 'lte':
      if (FIELD_WORDS[field].unit === 'money') {
        return `You are ${amount(gap)} above the income limit of ${amount(rule.value as number)}.`
      }
      return `Your ${label} is ${amount(value as number)}, above the limit of ${amount(rule.value as number)}.`
    case 'gte':
      return `You need ${label} of at least ${amount(rule.value as number)}; you have ${amount(value as number)}, which is ${amount(gap)} short.`
    case 'between': {
      const [min, max] = rule.value as [number, number]
      return `This scheme needs ${label} from ${amount(min)} to ${amount(max)}; yours is ${amount(value as number)}.`
    }
    case 'eq':
    case 'in': {
      const wanted = values(rule)
      if (typeof rule.value === 'boolean' && !rule.value && FIELD_WORDS[field].who) {
        return `This scheme isn't for ${FIELD_WORDS[field].who}.`
      }
      const who = wanted.map((v) => whoHas(field, v))
      if (who.every(Boolean)) return `This scheme is only for ${orList(who as string[])}.`
      return `This scheme needs your ${label} to be ${orList(wanted.map((v) => valueWords(field, v)))}.`
    }
    case 'notIn': {
      const who = whoHas(field, value)
      if (who) return `This scheme isn't for ${who}.`
      return `This scheme doesn't accept ${label}: ${valueWords(field, value)}.`
    }
    case 'isTrue':
      return `This scheme is only for ${FIELD_WORDS[field].who ?? label}.`
    case 'exists':
      // A set value always passes exists; kept so every operator has a line
      return `${describeRule(rule)}: you meet this.`
  }
}
