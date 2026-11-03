import { LogOut, MailWarning } from 'lucide-react'
import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/layout/Logo'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { Container } from '@/components/ui/Container'
import { resendVerification } from '@/features/auth/api'
import { loadSession, logOut, useSession } from '@/features/auth/session'
import { cn } from '@/lib/cn'

/** Shell for logged-in pages. Sends guests to /login and remembers where they were going. */
export function AppLayout() {
  const { t } = useTranslation()
  const session = useSession()
  const location = useLocation()
  const navigate = useNavigate()

  if (session.status === 'loading') {
    return (
      <p role="status" className="p-8 text-center text-muted">
        {t('common.loading')}
      </p>
    )
  }
  if (session.status === 'error') {
    return (
      <div className="mx-auto max-w-md p-8">
        <Alert tone="error">{t('app.loadError')}</Alert>
        <button
          type="button"
          className={cn(button.secondary, 'mt-4 w-full')}
          onClick={() => loadSession(true)}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }
  if (session.status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <Container className="flex h-16 items-center justify-between">
          <Logo to="/dashboard" />
          <button
            type="button"
            className={button.ghost}
            onClick={async () => {
              await logOut().catch(() => undefined)
              navigate('/', { replace: true })
            }}
          >
            <LogOut aria-hidden className="size-4" />
            {t('nav.logout')}
          </button>
        </Container>
      </header>
      {!session.user.verified && <VerifyBanner email={session.user.email} />}
      <main id="main" className="flex-1 py-6 sm:py-10">
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  )
}

function VerifyBanner({ email }: { email: string }) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  return (
    <div className="border-b border-almost/20 bg-almost-bg">
      <Container className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-almost" />
          {t('app.verifyBanner', { email })}
        </p>
        {state === 'sent' ? (
          <p role="status" className="font-medium text-eligible">
            {t('app.resent')}
          </p>
        ) : (
          <button
            type="button"
            disabled={state === 'sending'}
            className={cn(button.secondary, 'shrink-0')}
            onClick={() => {
              setState('sending')
              resendVerification().then(
                () => setState('sent'),
                () => setState('failed'),
              )
            }}
          >
            {state === 'sending' ? t('app.resending') : t('app.resend')}
          </button>
        )}
        {state === 'failed' && (
          <p role="alert" className="text-not">
            {t('common.serverError')}
          </p>
        )}
      </Container>
    </div>
  )
}
