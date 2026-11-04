import { useEffect, useSyncExternalStore } from 'react'
import type { MeResponse, PublicUser } from '@shared/schemas'
import { ApiError } from '@/lib/api'
import * as authApi from './api'

export type Session =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'error' }
  | { status: 'student'; user: PublicUser; profileComplete: number }

let state: Session = { status: 'loading' }
const listeners = new Set<() => void>()
let inFlight: Promise<void> | null = null

function set(next: Session) {
  state = next
  listeners.forEach((l) => l())
}

/** Loads the session from GET /me (once, unless forced). */
export function loadSession(force = false): Promise<void> {
  if (inFlight && !force) return inFlight
  inFlight = authApi
    .getMe()
    .then((me: MeResponse) => set({ status: 'student', ...me }))
    .catch((err) =>
      set(
        err instanceof ApiError && err.status === 401 ? { status: 'guest' } : { status: 'error' },
      ),
    )
  return inFlight
}

/** After login, register or verify: store the user we just got back. */
export function setStudent(user: PublicUser) {
  const profileComplete = state.status === 'student' ? state.profileComplete : 0
  set({ status: 'student', user, profileComplete })
  void loadSession(true)
}

/** After a profile save: update the percentage without another request. */
export function setProfileComplete(profileComplete: number) {
  if (state.status === 'student') set({ ...state, profileComplete })
}

export async function logOut() {
  try {
    await authApi.logout()
  } finally {
    set({ status: 'guest' })
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSession(): Session {
  const session = useSyncExternalStore(subscribe, () => state)
  useEffect(() => {
    if (session.status === 'loading') void loadSession()
  }, [session.status])
  return session
}
