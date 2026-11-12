import { isSchemeOpen } from '../../shared/dates.js'
import { evaluate } from '../../shared/eligibility/evaluate.js'
import {
  SchemeSchema,
  type MatchResult,
  type MatchSummary,
  type Scheme,
  type SchemeFile,
  type SchemesQuery,
  type SchemeSort,
} from '../../shared/schemas/index.js'
import { MatchResultModel } from '../models/MatchResult.js'
import { Scheme as SchemeModel } from '../models/Scheme.js'
import { decrypt, encrypt } from './crypto.js'
import { getProfile } from './profile.js'

/** A seeded scheme as read from MongoDB: the file's fields plus the seed's bookkeeping. */
export type StoredScheme = SchemeFile & { dataVersion: number }

type CachedMatch = MatchResult & { schemeId: string }

/** Shown in place of a match when nobody is signed in. */
export const LOGGED_OUT_MATCH: MatchSummary = {
  state: 'unknown',
  score: 0,
  reason: 'Sign in and fill your profile to see if you qualify.',
}

export async function loadActiveSchemes(): Promise<StoredScheme[]> {
  return (await SchemeModel.find({ status: 'active' }).lean()) as unknown as StoredScheme[]
}

export async function loadActiveScheme(id: string): Promise<StoredScheme | null> {
  return (await SchemeModel.findOne({
    id,
    status: 'active',
  }).lean()) as unknown as StoredScheme | null
}

/**
 * The student's results for these schemes, keyed by scheme id. Uses the matchResults cache while
 * the profile, the scheme data and the day are unchanged; otherwise re-runs evaluate() and saves.
 */
export async function matchesFor(
  userId: string,
  schemes: StoredScheme[],
  today: string,
): Promise<Map<string, MatchResult>> {
  const profile = await getProfile(userId)
  const dataVersion = Math.max(0, ...schemes.map((s) => s.dataVersion))
  const key = { profileVersion: profile.profileVersion, dataVersion, computedFor: today }

  const cached = await MatchResultModel.findOne({ userId, ...key }).lean()
  let results: CachedMatch[] | undefined
  if (cached) {
    try {
      results = decrypt(cached.results) as CachedMatch[]
    } catch {
      results = undefined // unreadable (e.g. key rotated): rebuild below
    }
  }
  // A scheme added without a dataVersion bump would be missing; rebuild rather than show a gap
  const cachedIds = new Set(results?.map((r) => r.schemeId))
  if (!results || schemes.some((s) => !cachedIds.has(s.id))) {
    results = schemes.map((scheme) => ({
      schemeId: scheme.id,
      ...evaluate(profile, scheme, today),
    }))
    await MatchResultModel.updateOne(
      { userId },
      { $set: { ...key, results: encrypt(results), computedAt: new Date() } },
      { upsert: true },
    )
  }
  return new Map(results.map(({ schemeId, ...result }) => [schemeId, result]))
}

/** The student's full result for one scheme, for the detail page. Runs the engine directly. */
export async function matchFor(userId: string, scheme: StoredScheme, today: string) {
  return evaluate(await getProfile(userId), scheme, today)
}

/**
 * A stored scheme → the API shape. Parsing with SchemeSchema drops `rules`, `notes` and the
 * seed's fields, so nothing internal can leak.
 */
export function toScheme(
  scheme: StoredScheme,
  today: string,
  match: MatchResult | undefined,
  withEligibility = false,
): Scheme {
  const summary: MatchSummary = match
    ? { state: match.state, score: match.score, reason: match.reason }
    : LOGGED_OUT_MATCH
  return SchemeSchema.parse({
    ...scheme,
    isOpen: isSchemeOpen(scheme, today),
    match: summary,
    ...(withEligibility && match ? { eligibility: match.reasons } : {}),
  })
}

/** Does a scheme pass the GET /schemes filters? */
export function matchesQuery(scheme: Scheme, query: SchemesQuery): boolean {
  if (query.aidType && scheme.aidType !== query.aidType) return false
  if (query.providerType && scheme.providerType !== query.providerType) return false
  if (query.group && !scheme.groups?.includes(query.group)) return false
  if (query.state && !scheme.states.includes('ALL') && !scheme.states.includes(query.state)) {
    return false
  }
  if (query.openOnly && !scheme.isOpen) return false
  if (query.q) {
    const needle = query.q.toLowerCase()
    const haystack = [scheme.name, scheme.provider, scheme.about ?? ''].join(' ').toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  return true
}

const STATE_ORDER = { eligible: 0, almost: 1, unknown: 2, not: 3 } as const

// Open schemes first, then the nearest deadline; all-year and unknown dates after dated ones
const byClosing = (a: Scheme, b: Scheme) =>
  Number(b.isOpen) - Number(a.isOpen) ||
  (a.closesOn ?? '9999-12-31').localeCompare(b.closesOn ?? '9999-12-31')

const SORTS: Record<SchemeSort, (a: Scheme, b: Scheme) => number> = {
  match: (a, b) =>
    STATE_ORDER[a.match.state] - STATE_ORDER[b.match.state] ||
    b.match.score - a.match.score ||
    byClosing(a, b),
  closing: byClosing,
  amount: (a, b) => (b.amountMax ?? -1) - (a.amountMax ?? -1) || byClosing(a, b),
  name: (a, b) => a.name.localeCompare(b.name),
}

export function sortSchemes(schemes: Scheme[], sort: SchemeSort): Scheme[] {
  return [...schemes].sort(SORTS[sort])
}
