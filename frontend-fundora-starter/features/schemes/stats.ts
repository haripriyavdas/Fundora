import { daysBetween } from '@shared/dates'
import type { Scheme } from '@shared/schemas'

/** Days ahead the dashboard counts as "closing soon". */
export const CLOSING_WINDOW_DAYS = 14

/** Dashboard numbers: schemes the student is eligible for, and matches closing within 14 days. */
export function matchStats(schemes: Scheme[], today: string) {
  const eligible = schemes.filter((s) => s.match.state === 'eligible').length
  const closing = schemes.filter((s) => {
    if (!s.isOpen || !s.closesOn) return false
    if (s.match.state !== 'eligible' && s.match.state !== 'almost') return false
    const daysLeft = daysBetween(today, s.closesOn)
    return daysLeft >= 0 && daysLeft <= CLOSING_WINDOW_DAYS
  }).length
  return { eligible, closing }
}
