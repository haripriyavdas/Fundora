// Dates are YYYY-MM-DD strings. Pure helpers: the caller passes `now` or `today` in.

/** Today's date in India (IST, UTC+5:30), whatever the server's time zone. */
export function todayInIndia(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Completed years between a date of birth and today. */
export function ageOn(dateOfBirth: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(dateOfBirth.slice(0, 4))
  // Not had this year's birthday yet
  return today.slice(5) < dateOfBirth.slice(5) ? years - 1 : years
}

/** Open today? No `opensOn` means already open; `closesOn` null (all year) or missing means no end. */
export function isSchemeOpen(
  scheme: { opensOn?: string; closesOn?: string | null },
  today: string,
): boolean {
  if (scheme.opensOn && today < scheme.opensOn) return false
  if (scheme.closesOn && today > scheme.closesOn) return false
  return true
}
