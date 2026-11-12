import { describe, expect, it } from 'vitest'
import { sheetRowToScheme } from './sheetRow.js'

const row = (cells: Record<string, string>) => ({
  id: 'test-scheme',
  name: 'Test Scheme',
  providerType: 'central',
  ...cells,
})

describe('sheetRowToScheme', () => {
  it('maps plain, list, number, JSON and portal columns', () => {
    const result = sheetRowToScheme(
      row({
        courses: 'engineering, computer-it',
        states: 'ALL',
        benefits: '₹25,000 a year\nUp to four years',
        amountMax: '25,000',
        rules: '[{"field":"gender","op":"in","value":["female"],"hard":true}]',
        portalName: 'NSP',
        portalUrl: 'https://scholarships.gov.in',
        about: '',
      }),
    )
    expect(result).toEqual({
      ok: true,
      folder: 'central',
      scheme: {
        id: 'test-scheme',
        name: 'Test Scheme',
        providerType: 'central',
        courses: ['engineering', 'computer-it'],
        states: ['ALL'],
        benefits: ['₹25,000 a year', 'Up to four years'],
        amountMax: 25000,
        rules: [{ field: 'gender', op: 'in', value: ['female'], hard: true }],
        portal: { name: 'NSP', url: 'https://scholarships.gov.in' },
      },
    })
  })

  it('reads "null" or "open all year" in closesOn as open all year', () => {
    const result = sheetRowToScheme(row({ closesOn: 'Open all year' }))
    expect(result.ok && result.scheme.closesOn).toBeNull()
  })

  it('picks the folder from the provider type, Karnataka-only state schemes, or the folder column', () => {
    const folder = (cells: Record<string, string>) => {
      const r = sheetRowToScheme(row(cells))
      return r.ok ? r.folder : r.errors
    }
    expect(folder({ providerType: 'bank' })).toBe('private')
    expect(folder({ providerType: 'state', states: 'KA' })).toBe('karnataka')
    expect(folder({ providerType: 'state', states: 'MH', folder: 'maharashtra' })).toBe(
      'maharashtra',
    )
    expect(folder({ providerType: 'state', states: 'MH' })).toEqual([
      expect.stringContaining('add a "folder" column'),
    ])
  })

  it('reports unknown columns, bad JSON and bad numbers', () => {
    const result = sheetRowToScheme(
      row({ closesOnn: '2026-10-31', steps: '[{', amountMax: 'lots' }),
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.errors).toEqual([
      'unknown column "closesOnn"',
      'amountMax: "lots" is not a number',
      'steps: not valid JSON',
    ])
  })
})
