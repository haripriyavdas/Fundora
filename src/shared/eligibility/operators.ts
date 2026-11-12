import type { Rule } from '../schemas/rule.js'

/** How one rule went for a value that is set. `gap` is how far a number missed the limit. */
export type Check = { result: 'met' | 'notMet' | 'near'; gap?: number }

// Rounds away float noise such as 0.1 + 0.2, so gaps read cleanly
const tidy = (n: number) => Math.round(n * 100) / 100

/** Passes inside the limit, `near` when a soft rule misses by no more than its nearMargin. */
function numeric(miss: number, rule: Rule): Check {
  if (miss <= 0) return { result: 'met' }
  const gap = tidy(miss)
  const near = !rule.hard && rule.nearMargin !== undefined && gap <= rule.nearMargin
  return { result: near ? 'near' : 'notMet', gap }
}

/**
 * Checks one rule against a profile value that is set (missing values are `unknown`, handled
 * in evaluate). A value of the wrong type never passes.
 */
export function checkRule(rule: Rule, value: unknown): Check {
  const met = (passes: boolean): Check => ({ result: passes ? 'met' : 'notMet' })
  const list = Array.isArray(rule.value) ? (rule.value as unknown[]) : []

  switch (rule.op) {
    case 'eq':
      return met(value === rule.value)
    case 'in':
      return met(list.includes(value))
    case 'notIn':
      return met(!list.includes(value))
    case 'lte':
      if (typeof value !== 'number') return met(false)
      return numeric(value - (rule.value as number), rule)
    case 'gte':
      if (typeof value !== 'number') return met(false)
      return numeric((rule.value as number) - value, rule)
    case 'between': {
      if (typeof value !== 'number') return met(false)
      const [min, max] = list as [number, number]
      return numeric(Math.max(min - value, value - max), rule)
    }
    case 'exists':
      return met(true)
    case 'isTrue':
      return met(value === true)
  }
}
