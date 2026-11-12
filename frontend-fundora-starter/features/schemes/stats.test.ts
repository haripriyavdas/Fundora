import { describe, expect, it } from 'vitest'
import type { MatchState, Scheme } from '@shared/schemas'
import { matchStats } from './stats'

const scheme = (state: MatchState, closesOn: string | null, isOpen = true) =>
  ({ match: { state, score: 0, reason: '' }, closesOn, isOpen }) as Scheme

describe('matchStats', () => {
  const today = '2026-11-12'

  it('counts eligible schemes', () => {
    const schemes = [
      scheme('eligible', null),
      scheme('eligible', '2027-01-01'),
      scheme('almost', null),
    ]
    expect(matchStats(schemes, today).eligible).toBe(2)
  })

  it('counts open eligible or almost matches closing within 14 days, inclusive', () => {
    const schemes = [
      scheme('eligible', '2026-11-12'), // today
      scheme('almost', '2026-11-26'), // day 14
      scheme('eligible', '2026-11-27'), // day 15
      scheme('not', '2026-11-20'),
      scheme('unknown', '2026-11-20'),
      scheme('eligible', '2026-11-20', false), // not open yet
      scheme('eligible', null), // all year
    ]
    expect(matchStats(schemes, today).closing).toBe(2)
  })
})
