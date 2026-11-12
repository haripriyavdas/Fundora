import { describe, expect, it } from 'vitest'
import { deadline, domainOf, formatDate } from './format'
import { filtersFromParams, withFilter, withoutFilters } from './filters'

describe('formatDate', () => {
  it('reads YYYY-MM-DD as a calendar date', () => {
    expect(formatDate('2026-11-17')).toBe('17 Nov 2026')
  })
})

describe('deadline', () => {
  const today = '2026-11-12'
  it('counts days left and flags the last 14 as soon', () => {
    expect(deadline({ closesOn: '2026-11-26', isOpen: true }, today)).toMatchObject({
      key: 'closes',
      count: 14,
      soon: true,
    })
    expect(deadline({ closesOn: '2026-11-27', isOpen: true }, today).soon).toBe(false)
  })
  it('handles today, closed, not yet open, all year and unknown dates', () => {
    expect(deadline({ closesOn: today, isOpen: true }, today).key).toBe('today')
    expect(deadline({ closesOn: '2026-11-01', isOpen: false }, today).key).toBe('closed')
    expect(
      deadline({ opensOn: '2026-12-01', closesOn: '2027-01-31', isOpen: false }, today).key,
    ).toBe('opens')
    expect(deadline({ closesOn: null, isOpen: true }, today).key).toBe('allYear')
    expect(deadline({ isOpen: true }, today).key).toBe('unknown')
  })
})

describe('domainOf', () => {
  it('shows the portal host without www', () => {
    expect(domainOf('https://www.scholarships.gov.in/apply')).toBe('scholarships.gov.in')
  })
})

describe('URL filters', () => {
  it('keeps valid values and drops ones the API would reject', () => {
    const params = new URLSearchParams(
      'aidType=loan&group=aliens&openOnly=true&sort=amount&tab=almost',
    )
    expect(filtersFromParams(params)).toEqual({ aidType: 'loan', openOnly: 'true', sort: 'amount' })
  })
  it('sets and clears one filter, keeping the tab', () => {
    const params = new URLSearchParams('tab=almost&aidType=loan')
    expect(withFilter(params, 'group', 'girls').toString()).toBe(
      'tab=almost&aidType=loan&group=girls',
    )
    expect(withFilter(params, 'aidType', undefined).toString()).toBe('tab=almost')
    expect(withoutFilters(params).toString()).toBe('tab=almost')
  })
})
