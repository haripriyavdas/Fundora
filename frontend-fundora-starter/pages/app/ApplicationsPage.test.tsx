// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SavedScheme, Scheme } from '@shared/schemas'
import * as applicationsApi from '@/features/applications/api'
import { getMe } from '@/features/auth/api'
import { loadSession } from '@/features/auth/session'
import { getSchemes } from '@/features/schemes/api'
import '@/i18n'
import ApplicationsPage from './ApplicationsPage'

vi.mock('@/features/schemes/api', () => ({ getSchemes: vi.fn(), getScheme: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ getMe: vi.fn() }))
vi.mock('@/features/applications/api', () => ({
  listSaved: vi.fn(),
  saveScheme: vi.fn(),
  updateSaved: vi.fn(),
  removeSaved: vi.fn(),
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}))

const api = vi.mocked(applicationsApi)

// Made-up scheme in the API shape
const award = {
  id: 'girls-award',
  name: 'Girls Award',
  provider: 'Example Foundation',
  providerType: 'private',
  aidType: 'scholarship',
  level: 'UG',
  courses: ['ALL'],
  states: ['ALL'],
  amount: '₹25,000 / year',
  closesOn: '2099-12-31',
  mode: 'onlineAndOffline',
  portal: { name: 'Example portal', url: 'https://www.example.org/apply' },
  sourceUrl: 'https://example.org/rules',
  verifiedOn: '2026-11-01',
  documents: [{ id: 'income-certificate', name: 'Income certificate' }],
  steps: [{ title: 'Register', text: 'Create an account on the portal.' }],
  isOpen: true,
  match: { state: 'eligible', score: 100, reason: 'You meet all 3 conditions.' },
} as Scheme

const savedAward: SavedScheme = { schemeId: 'girls-award', stage: 'saved', savedOn: '2026-11-10' }

// Each test signs in as a new student so the shared store reloads
let n = 0
async function openAs(items: SavedScheme[]) {
  api.listSaved.mockResolvedValue(items)
  vi.mocked(getMe).mockResolvedValue({
    user: { id: `u${++n}`, email: 'asha@example.com', verified: true },
    profileComplete: 100,
  })
  await loadSession(true)
  render(
    <MemoryRouter>
      <ApplicationsPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  vi.mocked(getSchemes).mockResolvedValue([award])
  api.getNotificationSettings.mockResolvedValue({ deadlineEmails: true, renewalEmails: true })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ApplicationsPage', () => {
  it('shows exactly three columns, with the saved scheme in Saved', async () => {
    await openAs([savedAward])
    const saved = await screen.findByRole('region', { name: /^Saved/ })
    expect(within(saved).getByRole('link', { name: 'Girls Award' })).toBeTruthy()
    expect(screen.getByRole('region', { name: /^Applied/ })).toBeTruthy()
    expect(screen.getByRole('region', { name: /^Renewal due/ })).toBeTruthy()
    // Columns plus the reminders card, nothing else
    expect(screen.getAllByRole('region')).toHaveLength(4)
  })

  it('moves a scheme with the stage menu', async () => {
    const user = await openAs([savedAward])
    api.updateSaved.mockResolvedValue({ ...savedAward, stage: 'applied', appliedOn: '2026-11-13' })
    await user.selectOptions(await screen.findByLabelText('Stage'), 'applied')
    expect(api.updateSaved).toHaveBeenCalledWith('girls-award', { stage: 'applied' })
    const applied = screen.getByRole('region', { name: /^Applied/ })
    expect(await within(applied).findByText('Applied on 13 Nov 2026')).toBeTruthy()
  })

  it('removes a scheme', async () => {
    const user = await openAs([savedAward])
    api.removeSaved.mockResolvedValue(undefined)
    await user.click(
      await screen.findByRole('button', { name: 'Remove Girls Award from my applications' }),
    )
    expect(await screen.findByText('Save a scheme')).toBeTruthy()
  })

  it('shows what to do when nothing is saved', async () => {
    await openAs([])
    expect(await screen.findByText('Save a scheme')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'See my matches' })).toBeTruthy()
  })

  it('turns reminder emails off', async () => {
    const user = await openAs([savedAward])
    api.updateNotificationSettings.mockResolvedValue({ deadlineEmails: false, renewalEmails: true })
    const box = await screen.findByRole('checkbox', { name: /Deadline reminders/ })
    await user.click(box)
    expect(api.updateNotificationSettings).toHaveBeenCalledWith({ deadlineEmails: false })
    expect((box as HTMLInputElement).checked).toBe(false)
  })
})
