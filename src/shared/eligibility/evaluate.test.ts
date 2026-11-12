import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ProfileFields } from '../schemas/profile.js'
import type { Rule } from '../schemas/rule.js'
import { SchemeFileSchema } from '../schemas/scheme.js'
import { evaluate, type EvaluableScheme } from './evaluate.js'
import { SAMPLE_PROFILES, anjali, meera, priya, rahul } from './fixtures/profiles.js'

const TODAY = '2026-06-01'

/** Runs one rule and returns how it went. */
function one(rule: Rule, profile: ProfileFields) {
  const result = evaluate(profile, { rules: [rule] }, TODAY)
  return result.reasons[0]
}
const resultOf = (rule: Rule, profile: ProfileFields) => one(rule, profile).result

describe('operators', () => {
  describe('lte (soft, nearMargin 50,000)', () => {
    const rule: Rule = { field: 'familyIncome', op: 'lte', value: 300000, nearMargin: 50000 }
    it.each([
      ['passes under the limit', 250000, 'met'],
      ['passes exactly on the limit', 300000, 'met'],
      ['is near one rupee over', 300001, 'near'],
      ['is near at the edge of the margin', 350000, 'near'],
      ['fails one rupee past the margin', 350001, 'notMet'],
      ['fails far over', 900000, 'notMet'],
    ])('%s', (_name, familyIncome, expected) => {
      expect(resultOf(rule, { familyIncome })).toBe(expected)
    })
    it('is unknown when the field is missing', () => {
      expect(resultOf(rule, {})).toBe('unknown')
    })
    it('a hard rule with no margin fails one over', () => {
      expect(
        resultOf({ ...rule, nearMargin: undefined, hard: true }, { familyIncome: 300001 }),
      ).toBe('notMet')
    })
  })

  describe('gte (soft, nearMargin 5)', () => {
    const rule: Rule = { field: 'class12Percent', op: 'gte', value: 60, nearMargin: 5 }
    it.each([
      ['passes above', 75, 'met'],
      ['passes exactly on the limit', 60, 'met'],
      ['is near one unit under', 59, 'near'],
      ['is near at the edge of the margin', 55, 'near'],
      ['fails just past the margin', 54.99, 'notMet'],
      ['fails one unit past the margin', 54, 'notMet'],
    ])('%s', (_name, class12Percent, expected) => {
      expect(resultOf(rule, { class12Percent })).toBe(expected)
    })
    it('is unknown when the field is missing', () => {
      expect(resultOf(rule, {})).toBe('unknown')
    })
  })

  describe('between (soft, nearMargin 5)', () => {
    const rule: Rule = { field: 'class10Percent', op: 'between', value: [40, 60], nearMargin: 5 }
    it.each([
      ['passes inside', 50, 'met'],
      ['passes on the lower edge', 40, 'met'],
      ['passes on the upper edge', 60, 'met'],
      ['is near one unit over', 61, 'near'],
      ['is near one unit under', 39, 'near'],
      ['is near at the edge of the margin', 65, 'near'],
      ['fails one unit past the upper margin', 66, 'notMet'],
      ['fails one unit past the lower margin', 34, 'notMet'],
    ])('%s', (_name, class10Percent, expected) => {
      expect(resultOf(rule, { class10Percent })).toBe(expected)
    })
    it('is unknown when the field is missing', () => {
      expect(resultOf(rule, {})).toBe('unknown')
    })
  })

  describe('eq', () => {
    const rule: Rule = { field: 'yearOfStudy', op: 'eq', value: 1, hard: true }
    it('passes on the value', () => expect(resultOf(rule, { yearOfStudy: 1 })).toBe('met'))
    it('fails one over', () => expect(resultOf(rule, { yearOfStudy: 2 })).toBe('notMet'))
    it('is unknown when missing', () => expect(resultOf(rule, {})).toBe('unknown'))
    it('never treats a numeric gap as near', () => {
      expect(resultOf({ ...rule, hard: false }, { yearOfStudy: 2 })).toBe('notMet')
    })
  })

  describe('in', () => {
    const rule: Rule = { field: 'courseCategory', op: 'in', value: ['engineering', 'computer-it'] }
    it('passes for a listed value', () => {
      expect(resultOf(rule, { courseCategory: 'computer-it' })).toBe('met')
    })
    it('fails for another value', () =>
      expect(resultOf(rule, { courseCategory: 'arts' })).toBe('notMet'))
    it('is unknown when missing', () => expect(resultOf(rule, {})).toBe('unknown'))
  })

  describe('notIn', () => {
    const rule: Rule = { field: 'category', op: 'notIn', value: ['GEN'] }
    it('passes for a value not listed', () =>
      expect(resultOf(rule, { category: 'SC' })).toBe('met'))
    it('fails for a listed value', () => expect(resultOf(rule, { category: 'GEN' })).toBe('notMet'))
    it('is unknown when missing', () => expect(resultOf(rule, {})).toBe('unknown'))
  })

  describe('exists', () => {
    const rule: Rule = { field: 'domicileState', op: 'exists' }
    it('passes when set', () => expect(resultOf(rule, { domicileState: 'KA' })).toBe('met'))
    it('is unknown when missing', () => expect(resultOf(rule, {})).toBe('unknown'))
  })

  describe('isTrue', () => {
    const rule: Rule = { field: 'firstGenLearner', op: 'isTrue' }
    it('passes for yes', () => expect(resultOf(rule, { firstGenLearner: true })).toBe('met'))
    it('fails for no', () => expect(resultOf(rule, { firstGenLearner: false })).toBe('notMet'))
    it('is unknown when missing', () => expect(resultOf(rule, {})).toBe('unknown'))
    it('reads nested fields', () => {
      const nested: Rule = { field: 'docs.incomeCertificate', op: 'isTrue' }
      expect(resultOf(nested, { docs: { incomeCertificate: true } })).toBe('met')
      expect(resultOf(nested, { docs: {} })).toBe('unknown')
    })
  })
})

describe('state', () => {
  const hard: Rule = { field: 'gender', op: 'in', value: ['female'], hard: true }
  const income: Rule = { field: 'familyIncome', op: 'lte', value: 300000, nearMargin: 50000 }
  const marks: Rule = { field: 'class12Percent', op: 'gte', value: 60, nearMargin: 5 }
  const attendance: Rule = { field: 'attendancePercent', op: 'gte', value: 75, nearMargin: 10 }
  const scheme = (...rules: Rule[]): EvaluableScheme => ({ rules })
  const nearAll = { familyIncome: 320000, class12Percent: 58, attendancePercent: 70 }

  it('is eligible when every rule is met', () => {
    const result = evaluate(meera, scheme(hard, income, marks), TODAY)
    expect(result.state).toBe('eligible')
    expect(result.reason).toBe('You meet all 3 conditions.')
  })

  it('a hard fail beats everything else', () => {
    const result = evaluate({ ...meera, gender: 'male' }, scheme(hard, income, marks), TODAY)
    expect(result.state).toBe('not')
    expect(result.reason).toBe('This scheme is only for girls and women.')
  })

  it('a hard fail beats a hard unknown', () => {
    const year: Rule = { field: 'yearOfStudy', op: 'eq', value: 1, hard: true }
    expect(evaluate({ yearOfStudy: 3 }, scheme(hard, year), TODAY).state).toBe('not')
  })

  it('a hard unknown makes it unknown', () => {
    const result = evaluate(priya, scheme(hard, income, marks), TODAY)
    expect(result.state).toBe('unknown')
    expect(result.reason).toBe('Add your gender to check this scheme.')
  })

  it('2 near misses are almost', () => {
    const result = evaluate(
      { ...meera, ...nearAll, attendancePercent: 90 },
      scheme(hard, income, marks, attendance),
      TODAY,
    )
    expect(result.state).toBe('almost')
    expect(result.reason).toBe('You are ₹20,000 above the income limit of ₹3,00,000.')
  })

  it('3 near misses are not eligible', () => {
    expect(
      evaluate({ ...meera, ...nearAll }, scheme(hard, income, marks, attendance), TODAY).state,
    ).toBe('not')
  })

  it('a near miss plus a missing soft field is almost', () => {
    const { attendancePercent: _a, ...noAttendance } = { ...meera, familyIncome: 320000 }
    expect(evaluate(noAttendance, scheme(hard, income, marks, attendance), TODAY).state).toBe(
      'almost',
    )
  })

  it('a soft fail past the margin is not eligible, and says why', () => {
    const result = evaluate({ ...meera, familyIncome: 900000 }, scheme(hard, income, marks), TODAY)
    expect(result.state).toBe('not')
    expect(result.reason).toBe('You are ₹6,00,000 above the income limit of ₹3,00,000.')
  })
})

describe('score', () => {
  const rules: Rule[] = [
    { field: 'courseCategory', op: 'in', value: ['engineering'], hard: true },
    { field: 'familyIncome', op: 'lte', value: 300000, nearMargin: 50000 },
  ]

  it('is the share of rules met', () => {
    expect(evaluate({ ...meera, familyIncome: 320000 }, { rules }, TODAY).score).toBe(50)
  })
  it('adds 10 when the student is in one of the scheme groups', () => {
    expect(
      evaluate({ ...meera, familyIncome: 320000 }, { rules, groups: ['girls'] }, TODAY).score,
    ).toBe(60)
    expect(
      evaluate({ ...rahul, familyIncome: 320000 }, { rules, groups: ['girls'] }, TODAY).score,
    ).toBe(50)
  })
  it('adds 5 when closing within 30 days, not after it closed', () => {
    const half = { ...meera, familyIncome: 320000 }
    expect(evaluate(half, { rules, closesOn: '2026-07-01' }, TODAY).score).toBe(55)
    expect(evaluate(half, { rules, closesOn: '2026-07-02' }, TODAY).score).toBe(50)
    expect(evaluate(half, { rules, closesOn: '2026-05-31' }, TODAY).score).toBe(50)
  })
  it('is capped at 100', () => {
    expect(
      evaluate(meera, { rules, groups: ['girls', 'rural'], closesOn: '2026-06-10' }, TODAY).score,
    ).toBe(100)
  })
})

describe('derived fields', () => {
  const adult: Rule = { field: 'age', op: 'gte', value: 18, hard: true }
  it('age counts completed years', () => {
    expect(resultOf(adult, { dateOfBirth: '2008-06-01' })).toBe('met') // 18th birthday today
    expect(resultOf(adult, { dateOfBirth: '2008-06-02' })).toBe('notMet') // tomorrow
  })
  it('age is unknown without a date of birth, and asks for it', () => {
    expect(one(adult, {}).text).toBe('Add your date of birth to your profile to check this.')
  })
  it('isFinalYear uses the course length', () => {
    const final: Rule = { field: 'isFinalYear', op: 'isTrue' }
    expect(resultOf(final, { courseCategory: 'engineering', yearOfStudy: 4 })).toBe('met')
    expect(resultOf(final, { courseCategory: 'engineering', yearOfStudy: 3 })).toBe('notMet')
    expect(resultOf(final, { courseCategory: 'commerce', yearOfStudy: 3 })).toBe('met')
    expect(resultOf(final, { yearOfStudy: 3 })).toBe('unknown')
  })
})

describe('reason text', () => {
  it('explains a percentage near miss', () => {
    const rule: Rule = { field: 'class12Percent', op: 'gte', value: 60, nearMargin: 5 }
    expect(one(rule, { class12Percent: 57 }).text).toBe(
      'You need Class 12 marks of at least 60%; you have 57%, which is 3% short.',
    )
  })
  it('names a met rule', () => {
    const rule: Rule = { field: 'familyIncome', op: 'lte', value: 250000 }
    expect(one(rule, { familyIncome: 100000 })).toEqual({
      rule: 'Family income up to ₹2,50,000',
      result: 'met',
      text: 'Family income up to ₹2,50,000: you meet this.',
    })
  })
  it('uses the rule label when there is one', () => {
    const rule: Rule = { field: 'orphan', op: 'isTrue', label: 'Lost both parents' }
    expect(one(rule, { orphan: true }).text).toBe('Lost both parents: you meet this.')
  })
  it('lists the allowed values on an in fail', () => {
    const rule: Rule = { field: 'courseCategory', op: 'in', value: ['engineering', 'computer-it'] }
    expect(one(rule, { courseCategory: 'arts' }).text).toBe(
      'This scheme is only for Engineering students or Computer / IT students.',
    )
  })
  it('asks for a missing field', () => {
    const rule: Rule = { field: 'category', op: 'in', value: ['SC', 'ST'], hard: true }
    expect(one(rule, {}).text).toBe('Add your category to your profile to check this.')
  })
})

describe('_example.json against the sample profiles', () => {
  const example = SchemeFileSchema.parse(
    JSON.parse(readFileSync('data/schemes/_example.json', 'utf8')),
  )
  // 16 days before it closes, so the closing-soon bonus applies
  const today = '2026-10-15'

  it('gives the expected states', () => {
    const states = Object.fromEntries(
      Object.entries(SAMPLE_PROFILES).map(([name, profile]) => [
        name,
        evaluate(profile, example, today).state,
      ]),
    )
    expect(states).toEqual({
      meera: 'eligible',
      anjali: 'almost',
      rahul: 'not',
      priya: 'unknown',
      kavya: 'not',
      newStudent: 'unknown',
    })
  })

  it.each(Object.entries(SAMPLE_PROFILES))('%s matches the snapshot', (_name, profile) => {
    expect(evaluate(profile, example, today)).toMatchSnapshot()
  })

  it('anjali, two near misses, is told the income gap first', () => {
    expect(evaluate(anjali, example, today).reason).toBe(
      'You are ₹20,000 above the income limit of ₹3,00,000.',
    )
  })
})
