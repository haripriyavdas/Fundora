import {
  AID_TYPES,
  PROVIDER_TYPES,
  SCHEME_GROUPS,
  SCHEME_SORTS,
  SchemesQuery,
} from '@shared/schemas'
import { STATE_CODES } from '@shared/constants'

/** Filter keys kept in the URL, so a filtered list can be shared, refreshed and gone back to. */
export const FILTER_KEYS = [
  'q',
  'aidType',
  'providerType',
  'group',
  'state',
  'openOnly',
  'sort',
] as const
export type FilterKey = (typeof FILTER_KEYS)[number]
export type Filters = Partial<Record<FilterKey, string>>

export const FILTER_OPTIONS = {
  aidType: AID_TYPES,
  providerType: PROVIDER_TYPES,
  group: SCHEME_GROUPS,
  state: STATE_CODES,
  sort: SCHEME_SORTS,
} as const

/** Reads the filters from the URL, dropping any value the API would reject. */
export function filtersFromParams(params: URLSearchParams): Filters {
  const filters: Filters = {}
  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (!value) continue
    if (SchemesQuery.shape[key].safeParse(value).success) filters[key] = value
  }
  return filters
}

/** Sets or clears one filter, keeping every other URL value (such as the matches tab). */
export function withFilter(params: URLSearchParams, key: string, value: string | undefined) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  return next
}

/** Removes every filter but keeps other values (the tab). */
export function withoutFilters(params: URLSearchParams) {
  const next = new URLSearchParams(params)
  for (const key of FILTER_KEYS) next.delete(key)
  return next
}

/** A stable string for effects: the same filters give the same key. */
export const filtersKey = (filters: Filters) =>
  FILTER_KEYS.map((key) => `${key}=${filters[key] ?? ''}`).join('&')
