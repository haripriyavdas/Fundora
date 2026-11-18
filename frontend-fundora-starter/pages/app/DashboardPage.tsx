import { Bookmark, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { todayInIndia } from '@shared/dates'
import { EmptyTile } from '@/components/app/EmptyTile'
import { SchemeCard } from '@/components/app/SchemeCard'
import { StatTile } from '@/components/app/StatTile'
import { button } from '@/components/ui/button'
import { Eyebrow, PageHeader } from '@/components/ui/Eyebrow'
import { useSaved } from '@/features/applications/store'
import { useSession } from '@/features/auth/session'
import { matchStats, savedStats } from '@/features/schemes/stats'
import { useSchemes } from '@/features/schemes/useSchemes'
import { cn } from '@/lib/cn'

const stats = ['eligible', 'closing', 'saved', 'offline'] as const

/** Saved schemes shown on the dashboard before "See all". */
const DASHBOARD_SAVED = 3

export default function DashboardPage() {
  const { t } = useTranslation()
  const session = useSession()
  const { state: schemes, retry } = useSchemes()
  const { state: saved, retry: retrySaved } = useSaved()
  if (session.status !== 'student') return null

  const today = todayInIndia()
  const counts = {
    ...(schemes.status === 'ready' ? matchStats(schemes.schemes, today) : {}),
    ...(schemes.status === 'ready' && saved.status === 'ready'
      ? savedStats(saved.items, schemes.schemes)
      : {}),
  }
  const statValue = (key: (typeof stats)[number]) => {
    if (schemes.status === 'loading' || saved.status === 'loading')
      return t('dashboard.loadingValue')
    const value = counts[key]
    return value === undefined ? t('dashboard.noValue') : String(value)
  }

  // Still to apply for, newest first, with their scheme details
  const byId = new Map(schemes.status === 'ready' ? schemes.schemes.map((s) => [s.id, s]) : [])
  const toApply =
    saved.status === 'ready'
      ? saved.items.filter((i) => i.stage !== 'applied' && byId.has(i.schemeId))
      : []

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
              value={statValue(key)}
              description={t(`dashboard.stats.${key}.text`)}
            />
          ))}
        </div>
        {schemes.status === 'error' || saved.status === 'error' ? (
          <p role="alert" className="mt-3 text-sm text-body">
            {t('dashboard.statsError')}{' '}
            <button
              type="button"
              onClick={() => {
                if (schemes.status === 'error') retry()
                if (saved.status === 'error') void retrySaved()
              }}
              className="font-semibold text-brand underline"
            >
              {t('dashboard.retry')}
            </button>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">{t('dashboard.statsNote')}</p>
        )}
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
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 id="applications-heading" className="text-3xl font-extrabold tracking-tight">
            {t('dashboard.applicationsTitle')}
          </h2>
          {toApply.length > 0 && (
            <Link to="/applications" className={button.secondary}>
              {t('dashboard.seeAllSaved')}
            </Link>
          )}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {toApply.slice(0, DASHBOARD_SAVED).map((item) => {
            const scheme = byId.get(item.schemeId)
            return (
              scheme && <SchemeCard key={item.schemeId} scheme={scheme} today={today} showMatch />
            )
          })}
          {toApply.length < DASHBOARD_SAVED && (
            <EmptyTile
              Icon={Bookmark}
              title={t('dashboard.saveTitle')}
              text={t('dashboard.saveText')}
            >
              <Link to="/browse" className={button.ink}>
                {t('nav.browse')}
              </Link>
            </EmptyTile>
          )}
        </div>
      </section>
    </div>
  )
}
