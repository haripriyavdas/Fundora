import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Trans, useTranslation } from 'react-i18next'
import { RegisterBody } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { TextField } from '@/components/ui/TextField'
import { register } from '@/features/auth/api'
import { setStudent, useSession } from '@/features/auth/session'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { GoogleButton, OrDivider } from './GoogleButton'
import { apiErrorMessage, checkFields, useShake, type FieldErrors } from './formHelpers'

export default function SignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useSession()
  const { shakeClass, shake, onAnimationEnd } = useShake()
  const [values, setValues] = useState({ email: '', password: '', consent: false })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [busy, setBusy] = useState(false)

  if (session.status === 'student' && !busy) return <Navigate to="/dashboard" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setEmailTaken(false)
    const checked = checkFields(RegisterBody, values)
    if (checked.errors) {
      setErrors(checked.errors)
      return shake()
    }
    setErrors({})
    setBusy(true)
    try {
      const { user } = await register(checked.data)
      setStudent(user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') setErrors(err.fields)
      else setFormError(apiErrorMessage(t, err))
      setEmailTaken(err instanceof ApiError && err.code === 'EMAIL_TAKEN')
      shake()
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            {t('nav.login')}
          </Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={onSubmit}
        className={cn('space-y-4', shakeClass)}
        onAnimationEnd={onAnimationEnd}
      >
        {formError && (
          <Alert tone="error">
            {formError}{' '}
            {emailTaken && (
              <Link to="/login" className="font-semibold text-brand underline">
                {t('nav.login')}
              </Link>
            )}
          </Alert>
        )}
        <TextField
          label={t('auth.email')}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          error={errors.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          name="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={values.password}
          error={errors.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consent"
              checked={values.consent}
              onChange={(e) => setValues({ ...values, consent: e.target.checked })}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? 'consent-error' : undefined}
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <span>
              <Trans
                i18nKey="auth.consent"
                components={{
                  privacy: (
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="font-semibold text-brand underline"
                    />
                  ),
                }}
              />
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" className="mt-1 text-sm text-not">
              {errors.consent}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className={cn(button.primary, 'w-full')}>
          {busy ? t('auth.creating') : t('auth.signupSubmit')}
        </button>
      </form>
      <div className="mt-4 space-y-4">
        <OrDivider />
        {/* Uses the same privacy box as the form above */}
        <GoogleButton
          mode="signup"
          to="/dashboard"
          consent={values.consent}
          onBusy={setBusy}
          onError={(err) => {
            setFormError(apiErrorMessage(t, err))
            setEmailTaken(err instanceof ApiError && err.code === 'EMAIL_TAKEN')
            shake()
          }}
        />
      </div>
    </AuthLayout>
  )
}
