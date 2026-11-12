import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { todayInIndia } from '@shared/dates'
import { MATCH_STATES, type MatchState } from '@shared/schemas'
import { FilterBar } from '@/components/app/FilterBar'
import { SchemeList } from '@/components/app/SchemeList'
import { button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/Eyebrow'
import { useSession } from '@/features/auth/session'
import { filtersFromParams, withFilter, withoutFilters } from '@/features/schemes/filters'
import { useSchemes } from '@/features/schemes/useSchemes'
import { cn } from '@/lib/cn'

const isMatchState = (value: string | null): value is MatchState =>
  MATCH_STATES.includes(value as MatchState)

/** Every scheme checked against the student's profile, in tabs by match state. */
export default function MatchesPage() {
  const { t } = useTranslation()
  const session = useSession()
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const tabParam = params.get('tab')
  const tab: MatchState = isMatchState(tabParam) ? tabParam : 'eligible'
  const { state, retry } = useSchemes(filters)
  const today = todayInIndia()

  const all = state.status === 'ready' ? state.schemes : []
  const count = (s: MatchState) => all.filter((scheme) => scheme.match.state === s).length
  const visible = all.filter((scheme) => scheme.match.state === tab)
  const profileComplete = session.status === 'student' ? session.profileComplete : 0
  const filtered = Object.keys(filters).length > 0
  const update = (next: URLSearchParams) => setParams(next, { replace: true })
  const clear = () => update(withoutFilters(params))

  let empty
  if (all.length === 0 && !filtered) {
    empty = { title: t('matches.noSchemesTitle'), text: t('matches.noSchemesText') }
  } else if (filtered) {
    empty = {
      title: t('matches.emptyFilteredTitle'),
      text: t('matches.emptyFilteredText'),
      action: (
        <button type="button" className={button.secondary} onClick={clear}>
          {t('schemes.filters.clear')}
        </button>
      ),
    }
  } else {
    empty = {
      title: t(`matches.empty.${tab}.title`),
      text: t(`matches.empty.${tab}.text`),
      action:
        tab === 'eligible' || tab === 'unknown' ? (
          <Link to="/profile" className={button.primary}>
            {t('matches.profileCta')}
          </Link>
        ) : undefined,
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow={t('matches.eyebrow')}
        title={t('matches.title')}
        intro={t('matches.intro')}
      />

      {profileComplete < 100 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm text-body">
            <UserRound aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" strokeWidth={1.75} />
            {t('matches.profileNudge', { percent: profileComplete })}
          </p>
          <Link to="/profile" className={cn(button.ink, 'shrink-0')}>
            {t('matches.profileCta')}
          </Link>
        </div>
      )}

      <FilterBar
        filters={filters}
        defaultSort="match"
        onChange={(key, value) => update(withFilter(params, key, value))}
        onClear={clear}
      />

      <div>
        <div
          role="tablist"
          aria-label={t('matches.tabsLabel')}
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {MATCH_STATES.map((s) => (
            <button
              key={s}
              id={`tab-${s}`}
              type="button"
              role="tab"
              aria-selected={tab === s}
              aria-controls="matches-panel"
              onClick={() => update(withFilter(params, 'tab', s === 'eligible' ? undefined : s))}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold',
                tab === s
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-line-strong bg-white text-ink hover:bg-surface-2',
              )}
            >
              {t(`schemes.match.${s}`)}
              {state.status === 'ready' && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    tab === s ? 'bg-white/15 text-on-accent' : 'bg-tile text-body',
                  )}
                >
                  {count(s)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div id="matches-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6">
          <SchemeList
            state={state.status}
            schemes={visible}
            today={today}
            showMatch
            onRetry={retry}
            empty={empty}
          />
        </div>
      </div>
    </div>
  )
}
