import type { COURSE_CATEGORIES } from '../constants.js'
import { ageOn, daysBetween } from '../dates.js'
import { readProfileField } from '../profileCompleteness.js'
import type { MatchResult, MatchState, RuleReason } from '../schemas/match.js'
import type { ProfileField, ProfileFields } from '../schemas/profile.js'
import type { SchemeFile } from '../schemas/scheme.js'
import { checkRule } from './operators.js'
import { checkText, describeRule, unknownCardText, unknownText } from './reasons.js'

/** The parts of a scheme the engine looks at. */
export type EvaluableScheme = Pick<SchemeFile, 'rules' | 'groups' | 'closesOn'>

/**
 * Usual length of a UG course in years, for `isFinalYear`. Courses whose length varies a lot
 * (e.g. 3-year vs 4-year honours under NEP) still use the common length; a scheme that depends
 * on final year should say so in its eligibility text too.
 */
const COURSE_YEARS: Record<(typeof COURSE_CATEGORIES)[number], number> = {
  arts: 3,
  science: 3,
  commerce: 3,
  management: 3,
  'computer-it': 3,
  engineering: 4,
  medicine: 5,
  dental: 5,
  pharmacy: 4,
  architecture: 5,
  agriculture: 4,
  nursing: 4,
  paramedical: 3,
  law: 5,
  education: 4,
  'design-fine-arts': 4,
  'hotel-management': 4,
  'social-sciences': 3,
  vocational: 3,
}

/** Reads a field, computing the derived ones (`age`, `isFinalYear`) from the profile and today. */
function readField(profile: ProfileFields, field: ProfileField, today: string): unknown {
  switch (field) {
    case 'age':
      return profile.dateOfBirth ? ageOn(profile.dateOfBirth, today) : undefined
    case 'isFinalYear':
      if (!profile.courseCategory || profile.yearOfStudy === undefined) return undefined
      return profile.yearOfStudy >= COURSE_YEARS[profile.courseCategory]
    default:
      return readProfileField(profile, field)
  }
}

/** Does the student belong to one of the groups the scheme is meant for (girls, disability, rural)? */
function inSchemeGroup(profile: ProfileFields, groups: EvaluableScheme['groups']): boolean {
  return (groups ?? []).some((group) => {
    switch (group) {
      case 'girls':
        return profile.gender === 'female'
      case 'disability':
        return profile.disability?.has === true
      case 'rural':
        return profile.rural === true
    }
  })
}

/**
 * Checks one student against one scheme (docs/eligibility-engine.md). Pure: `today`
 * (YYYY-MM-DD, India) is passed in so the same input always gives the same result.
 */
export function evaluate(
  profile: ProfileFields,
  scheme: EvaluableScheme,
  today: string,
): MatchResult {
  const checked = scheme.rules.map((rule) => {
    const value = readField(profile, rule.field, today)
    let reason: RuleReason
    if (value === undefined) {
      reason = { rule: describeRule(rule), result: 'unknown', text: unknownText(rule.field) }
    } else {
      const check = checkRule(rule, value)
      reason = {
        rule: describeRule(rule),
        result: check.result,
        text: checkText(rule, check, value),
      }
    }
    return { rule, reason }
  })

  const count = (result: RuleReason['result'], hard?: boolean) =>
    checked.filter(
      (c) => c.reason.result === result && (hard === undefined || !!c.rule.hard === hard),
    ).length
  const first = (result: RuleReason['result'], hard?: boolean) =>
    checked.find(
      (c) => c.reason.result === result && (hard === undefined || !!c.rule.hard === hard),
    )

  const total = checked.length
  const met = count('met')
  const misses = count('near') + count('unknown', false)

  let state: MatchState
  if (count('notMet', true) > 0) state = 'not'
  else if (count('unknown', true) > 0) state = 'unknown'
  else if (met === total) state = 'eligible'
  else if (count('notMet') === 0 && misses >= 1 && misses <= 2) state = 'almost'
  else state = 'not'

  let score = total === 0 ? 0 : Math.round((100 * met) / total)
  if (inSchemeGroup(profile, scheme.groups)) score += 10
  if (scheme.closesOn) {
    const daysLeft = daysBetween(today, scheme.closesOn)
    if (daysLeft >= 0 && daysLeft <= 30) score += 5
  }
  score = Math.min(score, 100)

  // Card line: hard fail → any fail → near miss → missing info → all met
  let reason: string
  const hardUnknown = first('unknown', true)
  if (state === 'unknown' && hardUnknown) {
    reason = unknownCardText(hardUnknown.rule.field)
  } else {
    const pick = first('notMet', true) ?? first('notMet') ?? first('near') ?? first('unknown')
    reason = pick
      ? pick.reason.text
      : `You meet all ${total} ${total === 1 ? 'condition' : 'conditions'}.`
  }

  return { state, score, reasons: checked.map((c) => c.reason), reason }
}
