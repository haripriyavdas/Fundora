import type { Scheme, SchemesQuery } from '@shared/schemas'
import { apiGet } from '@/lib/api'

type Filters = { [K in keyof SchemesQuery]?: string }

/** Every active scheme, each with the signed-in student's match (unknown when logged out). */
export function getSchemes(filters: Filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => !!entry[1]),
  )
  const query = params.size > 0 ? `?${params}` : ''
  return apiGet<Scheme[]>(`/schemes${query}`)
}

/** One scheme; `eligibility` explains every rule when signed in. */
export const getScheme = (id: string) => apiGet<Scheme>(`/schemes/${encodeURIComponent(id)}`)
