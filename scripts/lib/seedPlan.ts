import { createHash } from 'node:crypto'
import type { SchemeFile } from '../../src/shared/schemas/scheme.js'

export type ExistingScheme = {
  id: string
  status: 'active' | 'retired'
  contentHash: string
  dataVersion: number
}

export type SeedPlan = {
  added: string[]
  /** Content changed, or a retired scheme came back. */
  updated: string[]
  unchanged: string[]
  retired: string[]
  changed: boolean
  /** The dataVersion to stamp on what changes. Stays the same when nothing changed. */
  dataVersion: number
}

/** JSON with keys sorted at every level, so the hash doesn't depend on key order in the file. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function contentHash(scheme: SchemeFile): string {
  return createHash('sha256').update(stableJson(scheme)).digest('hex')
}

/** Works out what a seed run would do, without touching the database. */
export function planSeed(files: SchemeFile[], existing: ExistingScheme[]): SeedPlan {
  const byId = new Map(existing.map((s) => [s.id, s]))
  const fileIds = new Set(files.map((s) => s.id))
  const plan: SeedPlan = {
    added: [],
    updated: [],
    unchanged: [],
    retired: [],
    changed: false,
    dataVersion: 0,
  }

  for (const scheme of files) {
    const current = byId.get(scheme.id)
    if (!current) plan.added.push(scheme.id)
    else if (current.status === 'retired' || current.contentHash !== contentHash(scheme)) {
      plan.updated.push(scheme.id)
    } else plan.unchanged.push(scheme.id)
  }
  for (const s of existing) {
    if (s.status === 'active' && !fileIds.has(s.id)) plan.retired.push(s.id)
  }

  plan.changed = plan.added.length + plan.updated.length + plan.retired.length > 0
  const latest = Math.max(0, ...existing.map((s) => s.dataVersion))
  plan.dataVersion = plan.changed ? latest + 1 : latest
  return plan
}
