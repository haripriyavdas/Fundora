import { z } from 'zod'
import { PROFILE_FIELDS, ProfileFieldsSchema, type ProfileField } from './profile.js'

/** Operators the engine supports (docs/eligibility-engine.md). Adding one means a reason template and tests too. */
export const RULE_OPERATORS = [
  'eq',
  'in',
  'notIn',
  'lte',
  'gte',
  'between',
  'exists',
  'isTrue',
] as const
export type RuleOperator = (typeof RULE_OPERATORS)[number]

/** Operators that compare numbers, so they can have a `nearMargin`. */
const NUMERIC_OPERATORS: readonly RuleOperator[] = ['lte', 'gte', 'between']

type ValueType =
  { kind: 'number' } | { kind: 'boolean' } | { kind: 'string'; options?: readonly string[] }

/** What kind of value a profile field holds, read from the profile schema so the two can't drift. */
export function fieldValueType(field: ProfileField): ValueType {
  if (field === 'age' || field === 'disability.percent') return { kind: 'number' }
  if (field === 'isFinalYear' || field === 'disability.has' || field.startsWith('docs.')) {
    return { kind: 'boolean' }
  }
  const shape = ProfileFieldsSchema.shape as Record<string, z.ZodType>
  let schema = shape[field]
  if (schema instanceof z.ZodOptional) schema = schema.unwrap() as z.ZodType
  if (schema instanceof z.ZodNumber) return { kind: 'number' }
  if (schema instanceof z.ZodBoolean) return { kind: 'boolean' }
  if (schema instanceof z.ZodEnum) return { kind: 'string', options: schema.options as string[] }
  if (schema instanceof z.ZodLiteral)
    return { kind: 'string', options: [...schema.values] as string[] }
  return { kind: 'string' }
}

const Scalar = z.union([z.string(), z.number(), z.boolean()])

export const RuleSchema = z
  .strictObject({
    field: z.enum(PROFILE_FIELDS, { error: 'Not a profile field (see PROFILE_FIELDS).' }),
    op: z.enum(RULE_OPERATORS, { error: `Use one of: ${RULE_OPERATORS.join(', ')}.` }),
    value: z.union([Scalar, z.array(Scalar)]).optional(),
    hard: z.boolean().optional(),
    nearMargin: z.number().positive().optional(),
    label: z.string().trim().min(1).max(200).optional(),
  })
  .superRefine((rule, ctx) => {
    const problem = (message: string, path: string = 'value') =>
      ctx.addIssue({ code: 'custom', message, path: [path] })
    const type = fieldValueType(rule.field)
    const { value } = rule

    // Checks one value against the field: right type, and one of its options if it has a fixed list
    const checkScalar = (v: unknown): boolean => {
      if (typeof v !== type.kind) {
        problem(`${rule.field} holds a ${type.kind}, so compare it with a ${type.kind}.`)
        return false
      }
      if (type.kind === 'string' && type.options && !type.options.includes(v as string)) {
        problem(
          `"${String(v)}" isn't a value of ${rule.field}. Use one of: ${type.options.join(', ')}.`,
        )
        return false
      }
      return true
    }

    switch (rule.op) {
      case 'eq':
        if (value === undefined || Array.isArray(value)) problem('eq needs a single value.')
        else checkScalar(value)
        break
      case 'in':
      case 'notIn':
        if (!Array.isArray(value) || value.length === 0) {
          problem(`${rule.op} needs a list with at least one value.`)
        } else if (type.kind === 'boolean') {
          problem(`${rule.field} is yes/no; use isTrue or eq instead.`)
        } else {
          value.every(checkScalar)
        }
        break
      case 'lte':
      case 'gte':
        if (type.kind !== 'number') problem(`${rule.op} only works on number fields.`, 'op')
        else if (typeof value !== 'number') problem(`${rule.op} needs a number.`)
        break
      case 'between':
        if (type.kind !== 'number') problem('between only works on number fields.', 'op')
        else if (
          !Array.isArray(value) ||
          value.length !== 2 ||
          typeof value[0] !== 'number' ||
          typeof value[1] !== 'number' ||
          value[0] > value[1]
        ) {
          problem('between needs [min, max], with min no bigger than max.')
        }
        break
      case 'exists':
        if (value !== undefined) problem('exists takes no value.')
        break
      case 'isTrue':
        if (value !== undefined) problem('isTrue takes no value.')
        if (type.kind !== 'boolean') problem('isTrue only works on yes/no fields.', 'op')
        break
    }

    if (rule.nearMargin !== undefined) {
      if (!NUMERIC_OPERATORS.includes(rule.op)) {
        problem('nearMargin only works with lte, gte and between.', 'nearMargin')
      } else if (rule.hard) {
        problem("A hard rule can't be nearly met; remove nearMargin or hard.", 'nearMargin')
      }
    }
  })

export type Rule = z.infer<typeof RuleSchema>
