import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { todayInIndia } from '@shared/dates'
import { FilterBar } from '@/components/app/FilterBar'
import { SchemeList } from '@/components/app/SchemeList'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/Eyebrow'
import { useSession } from '@/features/auth/session'
import { filtersFromParams, withFilter, withoutFilters } from '@/features/schemes/filters'
import { useSchemes } from '@/features/schemes/useSchemes'

/** Every scheme with search and filters. Open to everyone; signed-in students also see their match. */
export default function BrowsePage() {
  const { t } = useTranslation()
  const session = useSession()
  const student = session.status === 'student'
  const [params, setParams] = useSearchParams()
  const filters = filtersFromParams(params)
  const { state, retry } = useSchemes(filters)
  const update = (next: URLSearchParams) => setParams(next, { replace: true })
  const clear = () => update(withoutFilters(params))
  const filtered = Object.keys(filters).length > 0

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow={t('browse.eyebrow')}
        title={t('browse.title')}
        intro={t('browse.intro')}
      />

      {session.status === 'guest' && (
        <Alert tone="info">
          {t('browse.guestNote')}{' '}
          <Link to="/signup" className="font-semibold underline">
            {t('nav.signup')}
          </Link>
          {' · '}
          <Link to="/login" className="font-semibold underline">
            {t('nav.login')}
          </Link>
        </Alert>
      )}

      <FilterBar
        filters={filters}
        search
        stateFilter
        defaultSort={student ? 'match' : 'closing'}
        onChange={(key, value) => update(withFilter(params, key, value))}
        onClear={clear}
      />

      <SchemeList
        state={state.status}
        schemes={state.status === 'ready' ? state.schemes : []}
        today={todayInIndia()}
        showMatch={student}
        onRetry={retry}
        empty={
          filtered
            ? {
                title: t('browse.emptyFilteredTitle'),
                text: t('browse.emptyFilteredText'),
                action: (
                  <button type="button" className={button.secondary} onClick={clear}>
                    {t('schemes.filters.clear')}
                  </button>
                ),
              }
            : { title: t('matches.noSchemesTitle'), text: t('matches.noSchemesText') }
        }
      />
    </div>
  )
}
