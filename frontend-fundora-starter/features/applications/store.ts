import { useEffect, useSyncExternalStore } from 'react'
import type { SavedScheme, SavedStage } from '@shared/schemas'
import { useSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'
import * as api from './api'

export type SavedState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: SavedScheme[] }

// One shared list, so the scheme page, the dashboard and the tracker always agree
let state: SavedState = { status: 'loading' }
/** Whose list `state` holds, so a different login never sees the last student's schemes. */
let owner: string | null = null
const listeners = new Set<() => void>()

function set(next: SavedState) {
  state = next
  listeners.forEach((l) => l())
}

function setItems(update: (items: SavedScheme[]) => SavedScheme[]) {
  if (state.status === 'ready') set({ status: 'ready', items: update(state.items) })
}

/** Loads the signed-in student's tracker from GET /saved. */
export async function loadSaved(userId: string) {
  owner = userId
  set({ status: 'loading' })
  try {
    const items = await api.listSaved()
    if (owner === userId) set({ status: 'ready', items })
  } catch {
    if (owner === userId) set({ status: 'error' })
  }
}

/** Adds a scheme as Saved. A 409 means it's already there, which is what the student wanted. */
export async function save(schemeId: string) {
  try {
    const item = await api.saveScheme(schemeId)
    setItems((items) => [item, ...items.filter((i) => i.schemeId !== schemeId)])
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && owner) return loadSaved(owner)
    throw err
  }
}

export async function setStage(schemeId: string, stage: SavedStage) {
  const item = await api.updateSaved(schemeId, { stage })
  setItems((items) => items.map((i) => (i.schemeId === schemeId ? item : i)))
}

export async function remove(schemeId: string) {
  await api.removeSaved(schemeId)
  setItems((items) => items.filter((i) => i.schemeId !== schemeId))
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The tracker for the signed-in student; loads on first use and when the student changes. */
export function useSaved() {
  const session = useSession()
  const userId = session.status === 'student' ? session.user.id : null
  const saved = useSyncExternalStore(subscribe, () => state)
  useEffect(() => {
    if (userId && userId !== owner) void loadSaved(userId)
  }, [userId])
  return {
    state: userId && userId === owner ? saved : ({ status: 'loading' } as SavedState),
    retry: () => userId && loadSaved(userId),
  }
}
