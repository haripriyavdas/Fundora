import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { profileCompleteness } from '@shared/profileCompleteness'
import { ProfileUpdateBody, type Profile } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { loadSession, setProfileComplete } from '@/features/auth/session'
import { saveProfile } from '@/features/profile/api'
import {
  PROFILE_STEPS,
  resumeStepIndex,
  stepKeys,
  stepPayload,
  toFormValues,
  type FieldDef,
} from '@/features/profile/steps'
import { useProfile } from '@/features/profile/useProfile'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { apiErrorMessage, useShake } from '@/pages/auth/formHelpers'
import { ProfileFieldInput } from './profile/ProfileFieldInput'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { state, retry } = useProfile()

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label={t('common.loading')} className="mx-auto max-w-xl space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-xl">
        <Alert tone="error">{t('profile.loadError')}</Alert>
        <button type="button" className={cn(button.secondary, 'mt-4 w-full')} onClick={retry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  return <ProfileWizard saved={state.profile} />
}

function ProfileWizard({ saved }: { saved: Profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { shakeClass, shake, onAnimationEnd } = useShake()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const form = useForm({
    resolver: zodResolver(ProfileUpdateBody),
    defaultValues: toFormValues(saved),
    mode: 'onTouched',
  })

  // The step lives in the URL, so refresh and the phone's back button both work
  const [resumeAt] = useState(() => resumeStepIndex(saved))
  const fromUrl = Number(params.get('step')) - 1
  const stepIndex = PROFILE_STEPS[fromUrl] ? fromUrl : resumeAt
  const step = PROFILE_STEPS[stepIndex]
  const isLast = stepIndex === PROFILE_STEPS.length - 1

  // On a new step, move focus to its heading so screen readers announce it
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    headingRef.current?.focus()
  }, [stepIndex])

  const goToStep = (index: number) => setParams({ step: String(index + 1) })

  /** Validates and saves only the current step. Returns whether it worked. */
  async function saveStep(): Promise<boolean> {
    setFormError('')
    if (!(await form.trigger(stepKeys(step), { shouldFocus: true }))) {
      shake()
      return false
    }
    setBusy(true)
    try {
      const profile = await saveProfile(stepPayload(step, form.getValues()))
      setProfileComplete(profileCompleteness(profile))
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) void loadSession(true)
      if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
        for (const [name, message] of Object.entries(err.fields)) {
          form.setError(name as keyof ProfileUpdateBody, { message })
        }
      }
      setFormError(apiErrorMessage(t, err))
      shake()
      return false
    } finally {
      setBusy(false)
    }
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault()
    if (!(await saveStep())) return
    if (isLast) navigate('/dashboard')
    else goToStep(stepIndex + 1)
  }

  async function onSaveAndExit() {
    if (await saveStep()) navigate('/dashboard')
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <p className="text-sm font-medium text-muted">
        {t('profile.stepOf', { current: stepIndex + 1, total: PROFILE_STEPS.length })}
      </p>
      <ol className="mt-2 flex gap-1.5" aria-label={t('profile.progress')}>
        {PROFILE_STEPS.map((s, index) => (
          <li
            key={s.id}
            aria-current={index === stepIndex ? 'step' : undefined}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              index <= stepIndex ? 'bg-brand' : 'bg-surface-2',
            )}
          >
            <span className="sr-only">{t(`profile.steps.${s.id}.title`)}</span>
          </li>
        ))}
      </ol>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-2xl font-bold tracking-tight outline-none sm:text-3xl"
      >
        {t(`profile.steps.${step.id}.title`)}
      </h1>
      <p className="mt-1 text-muted">{t(`profile.steps.${step.id}.intro`)}</p>

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={onContinue}
          onAnimationEnd={onAnimationEnd}
          className={cn(
            'mt-5 space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6',
            shakeClass,
          )}
        >
          {formError && <Alert tone="error">{formError}</Alert>}
          <StepFields key={step.id} fields={step.fields} />

          <p className="flex items-start gap-2 text-xs text-muted">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {t('profile.neverAsked')}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-between">
            <button type="submit" disabled={busy} className={button.primary}>
              {busy ? t('profile.saving') : isLast ? t('profile.finish') : t('profile.continue')}
            </button>
            {stepIndex > 0 && (
              <button
                type="button"
                disabled={busy}
                className={button.secondary}
                onClick={() => goToStep(stepIndex - 1)}
              >
                {t('profile.back')}
              </button>
            )}
          </div>
          {!isLast && (
            <button
              type="button"
              disabled={busy}
              className={cn(button.ghost, 'w-full')}
              onClick={onSaveAndExit}
            >
              {t('profile.saveAndExit')}
            </button>
          )}
        </form>
      </FormProvider>
    </div>
  )
}

function StepFields({ fields }: { fields: readonly FieldDef[] }) {
  const values = useWatch<ProfileUpdateBody>() as ProfileUpdateBody
  return (
    <>
      {fields
        .filter((def) => !def.showIf || def.showIf(values))
        .map((def) => (
          <ProfileFieldInput key={def.name} def={def} />
        ))}
    </>
  )
}
