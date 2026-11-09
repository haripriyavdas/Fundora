import { Bookmark, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyTile } from '@/components/app/EmptyTile'
import { StatTile } from '@/components/app/StatTile'
import { button } from '@/components/ui/button'
import { Eyebrow, PageHeader } from '@/components/ui/Eyebrow'
import { useSession } from '@/features/auth/session'
import { cn } from '@/lib/cn'

const stats = ['eligible', 'closing', 'saved', 'offline'] as const

// Stat values stay empty until matches (Phase 4) and the tracker exist
export default function DashboardPage() {
  const { t } = useTranslation()
  const session = useSession()
  if (session.status !== 'student') return null

  const { profileComplete } = session
  const ctaKey =
    profileComplete === 0
      ? 'dashboard.profileStart'
      : profileComplete === 100
        ? 'dashboard.profileEdit'
        : 'dashboard.profileContinue'

  return (
    <div className="space-y-10 animate-fade-up">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        intro={t('dashboard.subtitle', { email: session.user.email })}
      />

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          {t('dashboard.statsLabel')}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((key, i) => (
            <StatTile
              key={key}
              emphasis={i === 0}
              label={t(`dashboard.stats.${key}.label`)}
              value={t('dashboard.noValue')}
              description={t(`dashboard.stats.${key}.text`)}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{t('dashboard.statsPending')}</p>
      </section>

      <section aria-labelledby="profile-heading">
        <Eyebrow>{t('dashboard.profileEyebrow')}</Eyebrow>
        <div className="mt-3 rounded-2xl border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-tile text-ink">
              <UserRound aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 id="profile-heading" className="text-xl font-bold">
                {t('dashboard.profileTitle')}
              </h2>
              <p className="text-sm text-muted">
                {t('dashboard.profileComplete', { percent: profileComplete })}
              </p>
            </div>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-tile"
            role="progressbar"
            aria-label={t('dashboard.profileTitle')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profileComplete}
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${profileComplete}%` }}
            />
          </div>
          <p className="mt-4 text-sm text-body">{t('dashboard.matchesSoon')}</p>
          <Link to="/profile" className={cn(button.primary, 'mt-5 w-full sm:w-auto')}>
            {t(ctaKey)}
          </Link>
        </div>
      </section>

      <section aria-labelledby="applications-heading">
        <Eyebrow>{t('dashboard.applicationsEyebrow')}</Eyebrow>
        <h2 id="applications-heading" className="mt-2 text-3xl font-extrabold tracking-tight">
          {t('dashboard.applicationsTitle')}
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <EmptyTile
            Icon={Bookmark}
            title={t('dashboard.saveTitle')}
            text={t('dashboard.saveText')}
          >
            <Link to="/browse" className={button.ink}>
              {t('nav.browse')}
            </Link>
          </EmptyTile>
        </div>
      </section>
    </div>
  )
}
