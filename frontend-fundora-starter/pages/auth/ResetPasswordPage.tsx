import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { NewPasswordSchema, TokenBody } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { TextField } from '@/components/ui/TextField'
import { resetPassword } from '@/features/auth/api'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { apiErrorMessage, useShake } from './formHelpers'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const tokenOk = TokenBody.safeParse({ token }).success
  const { shakeClass, shake, onAnimationEnd } = useShake()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const checked = NewPasswordSchema.safeParse(password)
    if (!checked.success) {
      setError(checked.error.issues[0].message)
      return shake()
    }
    setError('')
    setBusy(true)
    try {
      await resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      setFormError(apiErrorMessage(t, err))
      shake()
    } finally {
      setBusy(false)
    }
  }

  if (!tokenOk || done) {
    return (
      <AuthLayout title={t('auth.resetTitle')}>
        <Alert tone={done ? 'success' : 'error'}>
          {done ? t('auth.resetDone') : t('auth.missingToken')}
        </Alert>
        <Link to={done ? '/login' : '/forgot'} className={cn(button.primary, 'mt-6 w-full')}>
          {done ? t('nav.login') : t('auth.requestNewLink')}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <Link to="/forgot" className="font-semibold text-brand hover:underline">
          {t('auth.requestNewLink')}
        </Link>
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
          label={t('auth.newPassword')}
          type="password"
          name="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          value={password}
          error={error}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy} className={cn(button.primary, 'w-full')}>
          {busy ? t('auth.saving') : t('auth.resetSubmit')}
        </button>
      </form>
    </AuthLayout>
  )
}
