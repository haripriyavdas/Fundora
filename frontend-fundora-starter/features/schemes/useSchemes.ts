import { useEffect, useState } from 'react'
import type { Scheme } from '@shared/schemas'
import { loadSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'
import { getSchemes } from './api'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; schemes: Scheme[] }

/** Loads the scheme list with the student's matches, with a retry for failed loads. */
export function useSchemes() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    getSchemes().then(
      (schemes) => {
        if (current) setState({ status: 'ready', schemes })
      },
      (err) => {
        if (err instanceof ApiError && err.status === 401) void loadSession(true)
        if (current) setState({ status: 'error' })
      },
    )
    return () => {
      current = false
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }
  return { state, retry }
}
