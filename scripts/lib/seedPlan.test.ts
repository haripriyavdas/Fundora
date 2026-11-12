import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { SchemeFile } from '../../src/shared/schemas/scheme.js'
import { contentHash, planSeed, type ExistingScheme } from './seedPlan.js'

const example = JSON.parse(readFileSync('data/schemes/_example.json', 'utf8')) as SchemeFile
const scheme = (id: string, extra: Partial<SchemeFile> = {}): SchemeFile => ({
  ...example,
  id,
  ...extra,
})
const stored = (s: SchemeFile, status: ExistingScheme['status'] = 'active', dataVersion = 3) => ({
  id: s.id,
  status,
  contentHash: contentHash(s),
  dataVersion,
})

describe('contentHash', () => {
  it('ignores key order', () => {
    const { id, name, ...rest } = example
    expect(contentHash({ name, ...rest, id } as SchemeFile)).toBe(contentHash(example))
  })

  it('changes when any value changes', () => {
    expect(contentHash({ ...example, amountMax: 30000 })).not.toBe(contentHash(example))
  })
})

describe('planSeed', () => {
  it('adds everything into an empty collection at dataVersion 1', () => {
    const plan = planSeed([scheme('a'), scheme('b')], [])
    expect(plan).toMatchObject({ added: ['a', 'b'], updated: [], retired: [], changed: true })
    expect(plan.dataVersion).toBe(1)
  })

  it('keeps the dataVersion when nothing changed, so match caches stay valid', () => {
    const a = scheme('a')
    const plan = planSeed([a], [stored(a)])
    expect(plan).toMatchObject({ unchanged: ['a'], changed: false, dataVersion: 3 })
  })

  it('updates changed schemes and bumps the dataVersion once', () => {
    const a = scheme('a')
    const plan = planSeed(
      [{ ...a, amount: '₹30,000 / year' }, scheme('b')],
      [stored(a), stored(scheme('b'))],
    )
    expect(plan).toMatchObject({ updated: ['a'], unchanged: ['b'], dataVersion: 4 })
  })

  it('retires active schemes whose file is gone, and leaves retired ones alone', () => {
    const plan = planSeed([], [stored(scheme('gone')), stored(scheme('old'), 'retired')])
    expect(plan).toMatchObject({ retired: ['gone'], changed: true, dataVersion: 4 })
  })

  it('brings a retired scheme back when its file returns', () => {
    const a = scheme('a')
    expect(planSeed([a], [stored(a, 'retired')]).updated).toEqual(['a'])
  })
})
