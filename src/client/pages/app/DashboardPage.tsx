import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/features/auth/session'

// Placeholder until the profile (Phase 2) and matches (Phase 4) exist
export default function DashboardPage() {
  const { t } = useTranslation()
  const session = useSession()
  if (session.status !== 'student') return null

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.title')}</h1>
        <p className="mt-1 text-muted">{t('dashboard.subtitle', { email: session.user.email })}</p>
      </div>
      <section
        aria-labelledby="profile-heading"
        className="rounded-2xl border border-line bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <UserRound aria-hidden className="size-5" />
          </span>
          <div>
            <h2 id="profile-heading" className="font-semibold">
              {t('dashboard.profileTitle')}
            </h2>
            <p className="text-sm text-muted">
              {t('dashboard.profileComplete', { percent: session.profileComplete })}
            </p>
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t('dashboard.profileTitle')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={session.profileComplete}
        >
          <div className="h-full bg-brand" style={{ width: `${session.profileComplete}%` }} />
        </div>
        <p className="mt-4 text-sm text-muted">{t('dashboard.profileSoon')}</p>
      </section>
    </div>
  )
}
