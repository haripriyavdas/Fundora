import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ForgotBody } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { TextField } from '@/components/ui/TextField'
import { forgotPassword } from '@/features/auth/api'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { apiErrorMessage, checkFields, useShake } from './formHelpers'

export default function ForgotPage() {
  const { t } = useTranslation()
  const { shakeClass, shake, onAnimationEnd } = useShake()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const checked = checkFields(ForgotBody, { email })
    if (checked.errors) {
      setError(checked.errors.email)
      return shake()
    }
    setError('')
    setBusy(true)
    try {
      await forgotPassword(checked.data)
      setSentTo(checked.data.email)
    } catch (err) {
      setFormError(apiErrorMessage(t, err))
      shake()
    } finally {
      setBusy(false)
    }
  }

  const backToLogin = (
    <Link to="/login" className="font-semibold text-brand hover:underline">
      {t('auth.backToLogin')}
    </Link>
  )

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      subtitle={sentTo ? undefined : t('auth.forgotSubtitle')}
      footer={backToLogin}
    >
      {sentTo ? (
        <Alert tone="success">{t('auth.forgotSent', { email: sentTo })}</Alert>
      ) : (
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
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy} className={cn(button.primary, 'w-full')}>
            {busy ? t('auth.sending') : t('auth.forgotSubmit')}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
