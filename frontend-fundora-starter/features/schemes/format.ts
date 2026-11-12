import { daysBetween } from '@shared/dates'
import type { Scheme } from '@shared/schemas'

/** Days ahead that count as "closing soon" on cards and in the dashboard tile. */
export const CLOSING_SOON_DAYS = 14

/** "17 Nov 2026". Dates are YYYY-MM-DD, read as calendar dates (no time zone shift). */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

/** Which deadline line a scheme shows, as an i18n key under `schemes.deadline` plus its values. */
export function deadline(
  scheme: Pick<Scheme, 'opensOn' | 'closesOn' | 'isOpen'>,
  today: string,
): { key: string; date?: string; count?: number; soon: boolean } {
  if (scheme.opensOn && today < scheme.opensOn) {
    return { key: 'opens', date: formatDate(scheme.opensOn), soon: false }
  }
  if (scheme.closesOn === null) return { key: 'allYear', soon: false }
  if (scheme.closesOn === undefined) return { key: 'unknown', soon: false }
  const daysLeft = daysBetween(today, scheme.closesOn)
  const date = formatDate(scheme.closesOn)
  if (daysLeft < 0) return { key: 'closed', date, soon: false }
  if (daysLeft === 0) return { key: 'today', date, soon: true }
  return { key: 'closes', date, count: daysLeft, soon: daysLeft <= CLOSING_SOON_DAYS }
}

/** "example.org" from a portal URL, for the "Opens … in a new tab" note. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
