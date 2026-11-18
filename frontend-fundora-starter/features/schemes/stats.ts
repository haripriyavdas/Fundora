import { daysBetween } from '@shared/dates'
import type { SavedScheme, Scheme } from '@shared/schemas'
import { CLOSING_SOON_DAYS } from './format'

/** Dashboard numbers: schemes the student is eligible for, and matches closing within 14 days. */
export function matchStats(schemes: Scheme[], today: string) {
  const eligible = schemes.filter((s) => s.match.state === 'eligible').length
  const closing = schemes.filter((s) => {
    if (!s.isOpen || !s.closesOn) return false
    if (s.match.state !== 'eligible' && s.match.state !== 'almost') return false
    const daysLeft = daysBetween(today, s.closesOn)
    return daysLeft >= 0 && daysLeft <= CLOSING_SOON_DAYS
  }).length
  return { eligible, closing }
}

/**
 * Tracker numbers: schemes still to apply for (Saved or Renewal due), and how many of those need
 * papers handed in at an office.
 */
export function savedStats(saved: SavedScheme[], schemes: Scheme[]) {
  const byId = new Map(schemes.map((s) => [s.id, s]))
  const toApply = saved.filter((i) => i.stage !== 'applied')
  const offline = toApply.filter((i) => byId.get(i.schemeId)?.mode === 'onlineAndOffline').length
  return { saved: toApply.length, offline }
}
