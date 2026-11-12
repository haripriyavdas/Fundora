// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Scheme } from '@shared/schemas'
import { listSaved, saveScheme } from '@/features/applications/api'
import { getMe } from '@/features/auth/api'
import { loadSession } from '@/features/auth/session'
import { getScheme, getSchemes } from '@/features/schemes/api'
import '@/i18n'
import { ApiError } from '@/lib/api'
import BrowsePage from './BrowsePage'
import MatchesPage from './MatchesPage'
import SchemePage from './SchemePage'

vi.mock('@/features/schemes/api', () => ({ getSchemes: vi.fn(), getScheme: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ getMe: vi.fn() }))
vi.mock('@/features/applications/api', () => ({ listSaved: vi.fn(), saveScheme: vi.fn() }))

const mockSchemes = vi.mocked(getSchemes)
const mockScheme = vi.mocked(getScheme)
const mockMe = vi.mocked(getMe)

// Made-up schemes in the API shape
function scheme(overrides: Partial<Scheme>): Scheme {
  return {
    id: 'example',
    name: 'Example Scholarship',
    provider: 'Example Foundation',
    providerType: 'private',
    aidType: 'scholarship',
    level: 'UG',
    courses: ['ALL'],
    states: ['ALL'],
    amount: '₹25,000 / year',
    closesOn: '2099-12-31',
    mode: 'online',
    portal: { name: 'Example portal', url: 'https://www.example.org/apply' },
    sourceUrl: 'https://example.org/rules',
    verifiedOn: new Date().toISOString().slice(0, 10),
    documents: [{ id: 'income-certificate', name: 'Income certificate' }],
    steps: [{ title: 'Register', text: 'Create an account on the portal.' }],
    isOpen: true,
    match: { state: 'eligible', score: 100, reason: 'You meet all 3 conditions.' },
    ...overrides,
  } as Scheme
}

const eligible = scheme({ id: 'girls-award', name: 'Girls Award' })
const almost = scheme({
  id: 'merit-loan',
  name: 'Merit Loan',
  aidType: 'loan',
  match: {
    state: 'almost',
    score: 70,
    reason: 'You are ₹20,000 above the income limit of ₹3,00,000.',
  },
})

async function signIn(profileComplete = 60) {
  mockMe.mockResolvedValue({
    user: { id: 'u1', email: 'asha@example.com', verified: true },
    profileComplete,
  })
  await loadSession(true)
}
async function signOut() {
  mockMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'no'))
  await loadSession(true)
}

function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/schemes/:schemeId" element={<SchemePage />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  mockSchemes.mockReset()
  mockScheme.mockReset()
  vi.mocked(listSaved).mockResolvedValue([])
})
afterEach(cleanup)

describe('/matches', () => {
  it('shows eligible schemes first with their reason, and counts every tab', async () => {
    await signIn()
    mockSchemes.mockResolvedValue([eligible, almost])
    const user = open('/matches')

    expect(await screen.findByRole('heading', { name: 'Girls Award' })).toBeTruthy()
    expect(screen.getByText('You meet all 3 conditions.')).toBeTruthy()
    expect(screen.queryByText('Merit Loan')).toBeNull()
    expect(screen.getByRole('tab', { name: /Almost eligible\s*1/ })).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: /Almost eligible/ }))
    expect(screen.getByRole('heading', { name: 'Merit Loan' })).toBeTruthy()
    expect(screen.getByText(/₹20,000 above the income limit/)).toBeTruthy()
  })

  it('asks for the rest of the profile when it is incomplete', async () => {
    await signIn(40)
    mockSchemes.mockResolvedValue([eligible])
    open('/matches')
    expect(await screen.findByText(/Your profile is 40% complete/)).toBeTruthy()
  })

  it('sends a filter to the API', async () => {
    await signIn(100)
    mockSchemes.mockResolvedValue([eligible])
    const user = open('/matches')
    await screen.findByRole('heading', { name: 'Girls Award' })

    await user.selectOptions(screen.getByLabelText('Type of help'), 'loan')
    expect(mockSchemes).toHaveBeenLastCalledWith({ aidType: 'loan' })
  })

  it('offers a retry when loading fails', async () => {
    await signIn(100)
    mockSchemes
      .mockRejectedValueOnce(new ApiError(500, 'SERVER', 'x'))
      .mockResolvedValue([eligible])
    const user = open('/matches')
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Girls Award' })).toBeTruthy()
  })
})

describe('/browse', () => {
  it('works logged out, without match chips, and searches on submit', async () => {
    await signOut()
    mockSchemes.mockResolvedValue([eligible])
    const user = open('/browse')

    expect(await screen.findByRole('heading', { name: 'Girls Award' })).toBeTruthy()
    expect(screen.queryByText('Eligible')).toBeNull()
    expect(screen.getByText(/Create a free profile/)).toBeTruthy()

    await user.type(screen.getByRole('searchbox'), 'girls')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(mockSchemes).toHaveBeenLastCalledWith({ q: 'girls' })
  })
})

describe('/schemes/:id', () => {
  it('explains each rule and links Apply to the official portal in a new tab', async () => {
    await signIn(100)
    mockScheme.mockResolvedValue({
      ...almost,
      eligibility: [
        { rule: 'For girls and women', result: 'met', text: 'For girls and women: you meet this.' },
        {
          rule: 'Family income up to ₹3,00,000',
          result: 'near',
          text: 'You are ₹20,000 above the income limit of ₹3,00,000.',
        },
      ],
    })
    open('/schemes/merit-loan')

    const eligibility = await screen.findByRole('region', { name: 'Eligibility' })
    expect(within(eligibility).getByText('You meet this')).toBeTruthy()
    expect(within(eligibility).getByText('Nearly')).toBeTruthy()

    const apply = screen.getByRole('link', { name: /Apply on the official portal/ })
    expect(apply.getAttribute('href')).toBe('https://www.example.org/apply')
    expect(apply.getAttribute('target')).toBe('_blank')
    expect(apply.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByText(/Opens example.org in a new tab/)).toBeTruthy()
    expect(screen.queryByText(/may be out of date/)).toBeNull()
  })

  it('warns when the details are over 90 days old, and asks guests to log in', async () => {
    await signOut()
    mockScheme.mockResolvedValue(scheme({ verifiedOn: '2025-01-01' }))
    open('/schemes/example')
    expect(await screen.findByText(/may be out of date/)).toBeTruthy()
    expect(screen.getByText(/Log in to see which of these conditions you meet/)).toBeTruthy()
  })

  it('says when a scheme does not exist', async () => {
    await signOut()
    mockScheme.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'))
    open('/schemes/nope')
    expect(await screen.findByRole('heading', { name: 'Scheme not found' })).toBeTruthy()
  })

  it('saves the scheme to My applications for a student', async () => {
    // A fresh student id so the shared tracker store loads this list
    mockMe.mockResolvedValue({
      user: { id: 'saver', email: 'asha@example.com', verified: true },
      profileComplete: 100,
    })
    await loadSession(true)
    vi.mocked(saveScheme).mockResolvedValue({
      schemeId: 'girls-award',
      stage: 'saved',
      savedOn: '2026-11-13',
    })
    mockScheme.mockResolvedValue(eligible)
    const user = open('/schemes/girls-award')

    const save = await screen.findByRole('button', { name: 'Save to my applications' })
    await vi.waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false))
    await user.click(save)
    expect(saveScheme).toHaveBeenCalledWith('girls-award')
    expect(await screen.findByText('In my applications: Saved')).toBeTruthy()
  })

  it('asks guests to log in to save', async () => {
    await signOut()
    mockScheme.mockResolvedValue(eligible)
    open('/schemes/girls-award')
    expect(await screen.findByRole('link', { name: 'Log in to save' })).toBeTruthy()
  })
})
