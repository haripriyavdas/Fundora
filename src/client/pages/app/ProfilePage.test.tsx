// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profile, ProfileUpdateBody } from '@shared/schemas'
import { getProfile, saveProfile } from '@/features/profile/api'
import '@/i18n'
import { ApiError } from '@/lib/api'
import ProfilePage from './ProfilePage'

vi.mock('@/features/profile/api', () => ({ getProfile: vi.fn(), saveProfile: vi.fn() }))

const mockGet = vi.mocked(getProfile)
const mockSave = vi.mocked(saveProfile)

function open(saved: Profile = { profileVersion: 0 }, url = '/profile') {
  mockGet.mockResolvedValue(saved)
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const heading = (name: string) => screen.findByRole('heading', { name })
const next = () => screen.getByRole('button', { name: 'Save and continue' })
const lastBody = () => mockSave.mock.lastCall?.[0] as ProfileUpdateBody
const yesNoGroup = (name: RegExp) => screen.getByRole('group', { name })

beforeEach(() => {
  window.scrollTo = vi.fn()
  mockSave.mockReset()
  mockGet.mockReset()
  mockSave.mockImplementation(async (body) => ({ profileVersion: 1, ...body }) as Profile)
})
afterEach(cleanup)

describe('profile wizard', () => {
  it('saves only the education step, with real types, then moves on', async () => {
    const user = open()
    await heading('Your education')

    await user.selectOptions(screen.getByLabelText('Course type'), 'engineering')
    await user.type(screen.getByLabelText('Course name'), '  B.E. Mechanical  ')
    await user.type(screen.getByLabelText('Year of study'), '2')
    await user.selectOptions(screen.getByLabelText('State your college is in'), 'KA')
    await user.click(next())

    await heading('Marks and attendance')
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(lastBody()).toEqual({
      educationLevel: 'UG',
      courseCategory: 'engineering',
      courseName: 'B.E. Mechanical',
      yearOfStudy: 2,
      institutionState: 'KA',
      institutionType: null,
    })
  })

  it('lets a student skip fields, which saves them as blank', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.click(next())
    await heading('Family and income')
    expect(lastBody()).toEqual({
      class10Percent: null,
      class12Percent: null,
      cgpa: null,
      attendancePercent: null,
    })
  })

  it('clears a saved answer when the student empties the field, instead of saving 0', async () => {
    const user = open({ profileVersion: 1, cgpa: 8, class10Percent: 91 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.clear(screen.getByLabelText('Current CGPA (out of 10)'))
    await user.click(next())
    await heading('Family and income')
    expect(lastBody()).toMatchObject({ cgpa: null, class10Percent: 91 })
  })

  it('clears saved text and a saved choice the same way', async () => {
    const user = open(
      { profileVersion: 1, courseName: 'B.Sc', courseCategory: 'science' },
      '/profile?step=1',
    )
    await heading('Your education')
    await user.clear(screen.getByLabelText('Course name'))
    await user.selectOptions(screen.getByLabelText('Course type'), '')
    await user.click(next())
    await heading('Marks and attendance')
    expect(lastBody()).toMatchObject({ courseName: null, courseCategory: null })
  })

  it('shows an inline error and does not save an invalid value', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')

    const percent = screen.getByLabelText('Class 12 or PUC percentage')
    await user.type(percent, '101')
    await user.click(next())

    expect(await screen.findByText('Enter a number from 0 to 100.')).toBeTruthy()
    expect(percent.getAttribute('aria-invalid')).toBe('true')
    expect(mockSave).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Marks and attendance' })).toBeTruthy()
  })

  it('rejects text typed into a number field', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.type(screen.getByLabelText('Current CGPA (out of 10)'), 'abc')
    await user.click(next())
    expect(await screen.findByText('Enter a CGPA from 0 to 10.')).toBeTruthy()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('accepts income with Indian commas, and explains why it is asked', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=3')
    await heading('Family and income')
    const income = screen.getByLabelText('Family income per year (₹)')
    expect(income.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText(/Used only to match schemes\. Encrypted\. Never shared\./)).toBeTruthy()

    await user.type(income, '2,50,000')
    await user.click(next())
    await heading('Category and background')
    expect(lastBody().familyIncome).toBe(250000)
  })

  it('only asks for the scholarship name after a Yes, and clears it after a No', async () => {
    const user = open(
      { profileVersion: 1, hasOtherScholarship: true, otherScholarshipName: 'Vidyasiri' },
      '/profile?step=3',
    )
    await heading('Family and income')
    const group = yesNoGroup(/another scholarship/)
    expect(screen.getByLabelText<HTMLInputElement>('Name of that scholarship').value).toBe(
      'Vidyasiri',
    )

    const no = group.querySelectorAll('input')[1]
    await user.click(no)
    await waitFor(() => expect(screen.queryByLabelText('Name of that scholarship')).toBeNull())

    await user.click(next())
    await heading('Category and background')
    expect(lastBody()).toMatchObject({ hasOtherScholarship: false, otherScholarshipName: null })
  })

  it('stores disability as one value, with the percent only after a Yes', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=4')
    await heading('Category and background')
    const group = yesNoGroup(/Do you have a disability/)
    expect(screen.queryByLabelText(/Disability percentage/)).toBeNull()

    await user.click(group.querySelectorAll('input')[0])
    await user.type(await screen.findByLabelText(/Disability percentage/), '40')
    await user.click(next())
    await heading('Documents you have')
    expect(lastBody().disability).toEqual({ has: true, percent: 40 })
  })

  it('drops the percent when a student changes their answer to No', async () => {
    const user = open(
      { profileVersion: 1, disability: { has: true, percent: 40 } },
      '/profile?step=4',
    )
    await heading('Category and background')
    await user.click(yesNoGroup(/Do you have a disability/).querySelectorAll('input')[1])
    await user.click(next())
    await heading('Documents you have')
    expect(lastBody().disability).toEqual({ has: false })
  })

  it('saves documents as yes/no flags, then finishes on the dashboard', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=5')
    await heading('Documents you have')
    await user.click(screen.getByLabelText('Income certificate'))
    await user.click(screen.getByRole('button', { name: 'Save and finish' }))

    await screen.findByText('dashboard page')
    expect(lastBody().docs).toEqual({
      incomeCertificate: true,
      casteCertificate: false,
      disabilityCertificate: false,
      domicileCertificate: false,
      bankAadhaarSeeded: false,
      class12Marksheet: false,
      feeReceipt: false,
    })
  })

  it('never renders an input for an ID number, account number or password', async () => {
    for (let step = 1; step <= 5; step++) {
      const user = open({ profileVersion: 1 }, `/profile?step=${step}`)
      await screen.findByRole('heading', { level: 1 })
      for (const input of document.querySelectorAll('input')) {
        expect(input.type).not.toBe('password')
        expect(input.name).not.toMatch(/aadhaar(num|no)|account|passw/i)
      }
      void user
      cleanup()
    }
  })

  it('resumes at the first step with nothing saved', async () => {
    open({ profileVersion: 2, courseName: 'B.Sc', cgpa: 8 })
    expect(await heading('Family and income')).toBeTruthy()
  })

  it('keeps unsaved typing when going back, and refills saved answers', async () => {
    const user = open({ profileVersion: 1, cgpa: 8 }, '/profile?step=2')
    await heading('Marks and attendance')
    expect(screen.getByLabelText<HTMLInputElement>('Current CGPA (out of 10)').value).toBe('8')

    await user.type(screen.getByLabelText('Class 10 percentage'), '91')
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await heading('Your education')
    expect(mockSave).not.toHaveBeenCalled()

    await user.click(next())
    await heading('Marks and attendance')
    expect(screen.getByLabelText<HTMLInputElement>('Class 10 percentage').value).toBe('91')
  })

  it('"Save and finish later" saves, then goes to the dashboard', async () => {
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.type(screen.getByLabelText('Attendance percentage'), '75')
    await user.click(screen.getByRole('button', { name: 'Save and finish later' }))
    await screen.findByText('dashboard page')
    expect(lastBody().attendancePercent).toBe(75)
  })

  it('stays on the step and keeps the typing when a save fails', async () => {
    mockSave.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'network'))
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.type(screen.getByLabelText('Class 10 percentage'), '91')
    await user.click(next())

    expect((await screen.findByRole('alert')).textContent).toMatch(/offline/)
    expect(screen.getByLabelText<HTMLInputElement>('Class 10 percentage').value).toBe('91')

    await user.click(next())
    await heading('Family and income')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a field error sent back by the API', async () => {
    mockSave.mockRejectedValueOnce(
      new ApiError(400, 'VALIDATION_FAILED', 'Please check the highlighted fields.', {
        cgpa: 'Enter a CGPA from 0 to 10.',
      }),
    )
    const user = open({ profileVersion: 1 }, '/profile?step=2')
    await heading('Marks and attendance')
    await user.click(next())
    expect(await screen.findByText('Enter a CGPA from 0 to 10.')).toBeTruthy()
  })

  it('offers a retry when the profile fails to load', async () => {
    mockGet.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'x'))
    mockGet.mockResolvedValueOnce({ profileVersion: 0 })
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProfilePage />
      </MemoryRouter>,
    )
    await screen.findByRole('alert')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await heading('Your education')).toBeTruthy()
  })
})
