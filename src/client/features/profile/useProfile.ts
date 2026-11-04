import { useEffect, useState } from 'react'
import type { Profile } from '@shared/schemas'
import { loadSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'
import { getProfile } from './api'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; profile: Profile }

/** Loads the student's saved profile once, with a retry for failed loads. */
export function useProfile() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    getProfile().then(
      (profile) => {
        if (current) setState({ status: 'ready', profile })
      },
      (err) => {
        // Session ended: refreshing it lets AppLayout send the student to /login
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
