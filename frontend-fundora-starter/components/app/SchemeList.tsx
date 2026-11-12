import { SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Scheme } from '@shared/schemas'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { EmptyTile } from './EmptyTile'
import { SchemeCard, SchemeCardSkeleton } from './SchemeCard'

/** A grid of scheme cards with loading, error and empty states. */
export function SchemeList({
  state,
  schemes,
  today,
  showMatch,
  onRetry,
  empty,
}: {
  state: 'loading' | 'error' | 'ready'
  schemes: Scheme[]
  today: string
  showMatch: boolean
  onRetry: () => void
  /** Shown when the list is ready but empty: what to do next. */
  empty: { title: string; text: string; action?: ReactNode }
}) {
  const { t } = useTranslation()

  if (state === 'loading') {
    return (
      <div
        role="status"
        aria-label={t('common.loading')}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <SchemeCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="max-w-md space-y-4">
        <Alert tone="error">{t('schemes.loadError')}</Alert>
        <button type="button" className={button.secondary} onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  if (schemes.length === 0) {
    return (
      <div className="max-w-xl">
        <EmptyTile Icon={SearchX} title={empty.title} text={empty.text}>
          {empty.action}
        </EmptyTile>
      </div>
    )
  }
  return (
    <>
      <p role="status" className="text-sm text-muted">
        {t('schemes.count', { count: schemes.length })}
      </p>
      <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {schemes.map((scheme) => (
          <li key={scheme.id} className="grid">
            <SchemeCard scheme={scheme} today={today} showMatch={showMatch} />
          </li>
        ))}
      </ul>
    </>
  )
}
