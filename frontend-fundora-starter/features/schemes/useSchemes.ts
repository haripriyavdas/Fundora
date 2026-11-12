import { useEffect, useState } from 'react'
import type { Scheme } from '@shared/schemas'
import { loadSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'
import { getScheme, getSchemes } from './api'
import { filtersKey, type Filters } from './filters'

type ListState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; schemes: Scheme[] }

/** The scheme list with the student's matches, filtered on the server. Reloads when filters change. */
export function useSchemes(filters: Filters = {}) {
  const [result, setResult] = useState<{ key: string; state: ListState } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${filtersKey(filters)}#${attempt}`

  useEffect(() => {
    let current = true
    getSchemes(filters).then(
      (schemes) => current && setResult({ key, state: { status: 'ready', schemes } }),
      (err) => {
        // Session ended: refreshing it lets the layout react
        if (err instanceof ApiError && err.status === 401) void loadSession(true)
        if (current) setResult({ key, state: { status: 'error' } })
      },
    )
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers the filters
  }, [key])

  // A result for older filters counts as loading, so stale lists never flash
  const state: ListState = result?.key === key ? result.state : { status: 'loading' }
  return { state, retry: () => setAttempt((n) => n + 1) }
}

type OneState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'ready'; scheme: Scheme }

/** One scheme; `eligibility` explains every rule when signed in. */
export function useScheme(id: string) {
  const [result, setResult] = useState<{ key: string; state: OneState } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${id}#${attempt}`

  useEffect(() => {
    let current = true
    getScheme(id).then(
      (scheme) => current && setResult({ key, state: { status: 'ready', scheme } }),
      (err) => {
        if (!current) return
        const notFound = err instanceof ApiError && (err.status === 404 || err.status === 400)
        setResult({ key, state: notFound ? { status: 'notFound' } : { status: 'error' } })
      },
    )
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers the id
  }, [key])

  const state: OneState = result?.key === key ? result.state : { status: 'loading' }
  return { state, retry: () => setAttempt((n) => n + 1) }
}
