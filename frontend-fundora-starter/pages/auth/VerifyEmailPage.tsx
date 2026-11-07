import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { TokenBody } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { verifyEmail } from '@/features/auth/api'
import { loadSession } from '@/features/auth/session'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { apiErrorMessage } from './formHelpers'

type State = { status: 'working' } | { status: 'done' } | { status: 'failed'; message: string }

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const tokenOk = TokenBody.safeParse({ token }).success
  const [state, setState] = useState<State>({ status: 'working' })
  const started = useRef(false)

  useEffect(() => {
    // Tokens are single use, so StrictMode's double effect must not send it twice
    if (!tokenOk || started.current) return
    started.current = true
    verifyEmail(token)
      .then(() => {
        setState({ status: 'done' })
        void loadSession(true)
      })
      .catch((err) => setState({ status: 'failed', message: apiErrorMessage(t, err) }))
  }, [token, tokenOk, t])

  const shown: State = tokenOk ? state : { status: 'failed', message: t('auth.verifyFailed') }

  return (
    <AuthLayout title={t('auth.verifyTitle')}>
      {shown.status === 'working' && (
        <p role="status" className="text-muted">
          {t('auth.verifyWorking')}
        </p>
      )}
      {shown.status === 'done' && <Alert tone="success">{t('auth.verifyDone')}</Alert>}
      {shown.status === 'failed' && (
        <>
          <Alert tone="error">{shown.message}</Alert>
          <p className="mt-3 text-sm text-muted">{t('auth.verifyResendHint')}</p>
        </>
      )}
      {shown.status !== 'working' && (
        <Link to="/dashboard" className={cn(button.primary, 'mt-6 w-full')}>
          {t('auth.goToDashboard')}
        </Link>
      )}
    </AuthLayout>
  )
}
