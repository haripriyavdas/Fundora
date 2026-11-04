import { describe, expect, it } from 'vitest'
import { profileCompleteness, readProfileField } from './profileCompleteness.js'

describe('profileCompleteness', () => {
  it('is 0 for an empty profile', () => {
    expect(profileCompleteness({})).toBe(0)
  })

  it('does not count educationLevel, which the wizard sets by itself', () => {
    expect(profileCompleteness({ educationLevel: 'UG' })).toBe(0)
  })

  it('goes up as fields are filled', () => {
    const one = profileCompleteness({ courseName: 'B.Sc' })
    const two = profileCompleteness({ courseName: 'B.Sc', cgpa: 8 })
    expect(one).toBeGreaterThan(0)
    expect(two).toBeGreaterThan(one)
  })

  it('counts 0 and false as answers', () => {
    expect(profileCompleteness({ cgpa: 0, rural: false })).toBeGreaterThan(0)
  })

  it('counts each document flag', () => {
    expect(profileCompleteness({ docs: { feeReceipt: false } })).toBeGreaterThan(
      profileCompleteness({ docs: {} }),
    )
  })

  it.todo('reaches 100 for a first-year student with no disability and no other scholarship')
})

describe('readProfileField', () => {
  it('reads top-level and dotted fields', () => {
    const profile = { cgpa: 8, docs: { feeReceipt: true } }
    expect(readProfileField(profile, 'cgpa')).toBe(8)
    expect(readProfileField(profile, 'docs.feeReceipt')).toBe(true)
  })

  it('returns undefined when the parent is missing', () => {
    expect(readProfileField({}, 'disability.percent')).toBeUndefined()
  })
})
