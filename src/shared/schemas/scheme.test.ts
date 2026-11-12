import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { RuleSchema } from './rule.js'
import { SchemeFileSchema } from './scheme.js'

const example = JSON.parse(readFileSync('data/schemes/_example.json', 'utf8')) as Record<
  string,
  unknown
>

/** Paths of the issues, e.g. ['portal.url'], so tests don't depend on message wording. */
function problems(input: unknown, schema: z.ZodType = SchemeFileSchema) {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('SchemeFileSchema', () => {
  it('accepts data/schemes/_example.json', () => {
    expect(problems(example)).toEqual([])
  })

  it('rejects unknown keys, so a typo is never silently dropped', () => {
    expect(problems({ ...example, closesOnn: '2026-10-31' })).toEqual([''])
  })

  it('rejects an id that is not a lowercase slug', () => {
    expect(problems({ ...example, id: 'Example_Scheme' })).toEqual(['id'])
  })

  it('rejects http links for the portal, the source and official documents', () => {
    expect(problems({ ...example, sourceUrl: 'http://example.org/page' })).toEqual(['sourceUrl'])
    expect(problems({ ...example, portal: { name: 'X', url: 'http://example.org' } })).toEqual([
      'portal.url',
    ])
  })

  it('needs the offline step when mode is onlineAndOffline', () => {
    expect(problems({ ...example, offline: null })).toEqual(['offline'])
    expect(problems({ ...example, mode: 'online', offline: null })).toEqual([])
  })

  it('allows closesOn null for open all year, but not before opensOn', () => {
    expect(problems({ ...example, closesOn: null })).toEqual([])
    expect(problems({ ...example, closesOn: '2026-06-01' })).toEqual(['closesOn'])
  })

  it('accepts ALL only on its own', () => {
    expect(problems({ ...example, states: ['ALL'] })).toEqual([])
    expect(problems({ ...example, states: ['ALL', 'KA'] })).toEqual(['states'])
    expect(problems({ ...example, states: ['XX'] })).toEqual(['states.0'])
  })

  it('needs at least one rule, one document and one step', () => {
    expect(problems({ ...example, rules: [] })).toEqual(['rules'])
    expect(problems({ ...example, documents: [] })).toEqual(['documents'])
    expect(problems({ ...example, steps: [] })).toEqual(['steps'])
  })

  it('rejects a document id used twice', () => {
    const doc = { id: 'fee-receipt', name: 'Fee receipt' }
    expect(problems({ ...example, documents: [doc, doc] })).toEqual(['documents.1.id'])
  })
})

describe('RuleSchema', () => {
  const rule = (r: unknown) => problems(r, RuleSchema)

  it('accepts the rule shapes the engine supports', () => {
    expect(rule({ field: 'gender', op: 'in', value: ['female'], hard: true })).toEqual([])
    expect(rule({ field: 'yearOfStudy', op: 'eq', value: 1 })).toEqual([])
    expect(rule({ field: 'familyIncome', op: 'lte', value: 250000, nearMargin: 50000 })).toEqual([])
    expect(rule({ field: 'age', op: 'between', value: [17, 25] })).toEqual([])
    expect(rule({ field: 'disability.has', op: 'isTrue' })).toEqual([])
    expect(rule({ field: 'docs.incomeCertificate', op: 'isTrue' })).toEqual([])
    expect(rule({ field: 'cgpa', op: 'exists' })).toEqual([])
  })

  it('rejects a field that is not in PROFILE_FIELDS', () => {
    expect(rule({ field: 'aadhaarNumber', op: 'exists' })).toEqual(['field'])
  })

  it('rejects an unknown operator', () => {
    expect(rule({ field: 'cgpa', op: 'gt', value: 6 })).toEqual(['op'])
  })

  it('rejects a value that is not one of the field options', () => {
    expect(rule({ field: 'gender', op: 'in', value: ['Female'] })).toEqual(['value'])
    expect(rule({ field: 'category', op: 'eq', value: 'General' })).toEqual(['value'])
  })

  it('rejects a value of the wrong type', () => {
    expect(rule({ field: 'familyIncome', op: 'lte', value: '250000' })).toEqual(['value'])
    expect(rule({ field: 'yearOfStudy', op: 'eq', value: '1' })).toEqual(['value'])
  })

  it('rejects number comparisons on text fields and isTrue on non yes/no fields', () => {
    expect(rule({ field: 'courseName', op: 'gte', value: 1 })).toEqual(['op'])
    expect(rule({ field: 'cgpa', op: 'isTrue' })).toEqual(['op'])
  })

  it('needs a list for in, and [min, max] in order for between', () => {
    expect(rule({ field: 'gender', op: 'in', value: 'female' })).toEqual(['value'])
    expect(rule({ field: 'gender', op: 'in', value: [] })).toEqual(['value'])
    expect(rule({ field: 'age', op: 'between', value: [25, 17] })).toEqual(['value'])
  })

  it('allows nearMargin only on soft number rules', () => {
    expect(rule({ field: 'gender', op: 'in', value: ['female'], nearMargin: 1 })).toEqual([
      'nearMargin',
    ])
    expect(rule({ field: 'cgpa', op: 'gte', value: 6, nearMargin: 0.5, hard: true })).toEqual([
      'nearMargin',
    ])
  })
})
