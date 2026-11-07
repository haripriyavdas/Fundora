import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LoginBody } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { TextField } from '@/components/ui/TextField'
import { login } from '@/features/auth/api'
import { setStudent, useSession } from '@/features/auth/session'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { apiErrorMessage, checkFields, useShake, type FieldErrors } from './formHelpers'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const { shakeClass, shake, onAnimationEnd } = useShake()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  // Where AppLayout sent the student from, if anywhere
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (session.status === 'student' && !busy) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const checked = checkFields(LoginBody, values)
    if (checked.errors) {
      setErrors(checked.errors)
      return shake()
    }
    setErrors({})
    setBusy(true)
    try {
      const { user } = await login(checked.data)
      setStudent(user)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(apiErrorMessage(t, err))
      shake()
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="font-semibold text-brand hover:underline">
            {t('auth.createAccount')}
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
        {formError && <Alert tone="error">{formError}</Alert>}
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
        <div>
          <TextField
            label={t('auth.password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            error={errors.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
          <Link
            to="/forgot"
            className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline"
          >
            {t('auth.forgotLink')}
          </Link>
        </div>
        <button type="submit" disabled={busy} className={cn(button.primary, 'w-full')}>
          {busy ? t('auth.loggingIn') : t('auth.loginSubmit')}
        </button>
      </form>
    </AuthLayout>
  )
}
