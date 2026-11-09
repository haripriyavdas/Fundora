import {
  ClipboardList,
  House,
  ListChecks,
  LogOut,
  MailWarning,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/layout/Logo'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { resendVerification } from '@/features/auth/api'
import { loadSession, logOut, useSession } from '@/features/auth/session'
import { cn } from '@/lib/cn'

const navItems: { to: string; key: string; Icon: LucideIcon }[] = [
  { to: '/dashboard', key: 'home', Icon: House },
  { to: '/matches', key: 'matches', Icon: ListChecks },
  { to: '/applications', key: 'applications', Icon: ClipboardList },
  { to: '/browse', key: 'browse', Icon: Search },
  { to: '/profile', key: 'profile', Icon: UserRound },
]

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

  async function onLogOut() {
    await logOut().catch(() => undefined)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh lg:pl-[300px]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        {t('common.skipToContent')}
      </a>

      {/* Desktop: fixed charcoal sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[300px] flex-col bg-accent px-5 py-6 lg:flex">
        <div className="px-2">
          <Logo to="/dashboard" onDark />
        </div>
        <nav aria-label={t('nav.app')} className="mt-10">
          <ul className="space-y-1">
            {navItems.map(({ to, key, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-full px-4 font-medium transition-colors',
                      isActive
                        ? 'bg-brand text-white'
                        : 'text-on-accent-muted hover:bg-white/5 hover:text-on-accent',
                    )
                  }
                >
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                  {t(`nav.${key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/15 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-on-accent-muted uppercase">
              {t('app.guideNoteTitle')}
            </p>
            <p className="mt-2 text-sm text-on-accent">{t('app.guideNote')}</p>
          </div>
          <button
            type="button"
            onClick={onLogOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 font-medium text-on-accent-muted hover:bg-white/5 hover:text-on-accent"
          >
            <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Phone and tablet: top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-accent px-4 lg:hidden">
        <Logo to="/dashboard" onDark />
        <button
          type="button"
          onClick={onLogOut}
          className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-on-accent-muted hover:text-on-accent"
        >
          <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
          {t('nav.logout')}
        </button>
      </header>

      {!session.user.verified && <VerifyBanner email={session.user.email} />}

      <main id="main" className="px-4 pt-6 pb-28 sm:px-8 sm:pt-10 lg:pb-12">
        <div className="mx-auto max-w-[1100px]">
          <Outlet />
        </div>
      </main>

      {/* Phone and tablet: bottom nav */}
      <nav
        aria-label={t('nav.app')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-accent pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {navItems.map(({ to, key, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                    isActive ? 'text-on-accent' : 'text-on-accent-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full',
                        isActive && 'bg-brand text-white',
                      )}
                    >
                      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    {t(`nav.${key}Short`)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function VerifyBanner({ email }: { email: string }) {
  const { t } = useTranslation()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  return (
    <div className="bg-warn-bg text-warn">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-start gap-2">
          <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
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
      </div>
    </div>
  )
}
