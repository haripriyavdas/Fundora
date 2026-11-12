import { GraduationCap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Scheme } from '@shared/schemas'
import { button } from '@/components/ui/button'
import { deadline } from '@/features/schemes/format'
import { cn } from '@/lib/cn'
import { MatchChip, ModeChip } from './MatchChip'

/**
 * White scheme card: type, name, provider, match + mode chips, the match reason, award and deadline.
 * `showMatch` is off for logged-out visitors, who have no match to show.
 */
export function SchemeCard({
  scheme,
  today,
  showMatch,
}: {
  scheme: Scheme
  today: string
  showMatch: boolean
}) {
  const { t } = useTranslation()
  const due = deadline(scheme, today)

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-tile text-ink">
          <GraduationCap aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          {t(`schemes.aidType.${scheme.aidType}`)}
        </p>
      </div>

      <h3 className="mt-4 text-xl leading-snug font-bold text-ink">
        <Link to={`/schemes/${scheme.id}`} className="hover:underline">
          {scheme.name}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-muted">{scheme.provider}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {showMatch && <MatchChip state={scheme.match.state} />}
        <ModeChip mode={scheme.mode} />
      </div>
      {showMatch && <p className="mt-3 text-sm text-body">{scheme.match.reason}</p>}

      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        <div className="min-w-0">
          <p className="font-bold text-ink">{scheme.amount}</p>
          <p className={cn('mt-0.5 text-sm', due.soon ? 'font-semibold text-not' : 'text-muted')}>
            {t(`schemes.deadline.${due.key}`, { date: due.date, count: due.count })}
          </p>
        </div>
        <Link
          to={`/schemes/${scheme.id}`}
          className={cn(button.secondary, 'shrink-0')}
          aria-label={t('schemes.detailsFor', { name: scheme.name })}
        >
          {t('schemes.details')}
        </Link>
      </div>
    </article>
  )
}

/** Grey placeholder cards while a list loads. */
export function SchemeCardSkeleton() {
  return (
    <div aria-hidden className="rounded-2xl border border-line bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="size-9 rounded-xl bg-tile" />
        <span className="h-3 w-24 rounded-full bg-tile" />
      </div>
      <div className="mt-5 h-5 w-3/4 rounded-full bg-tile" />
      <div className="mt-2 h-4 w-1/2 rounded-full bg-line-soft" />
      <div className="mt-5 flex gap-2">
        <span className="h-6 w-20 rounded-full bg-tile" />
        <span className="h-6 w-24 rounded-full bg-line-soft" />
      </div>
      <div className="mt-8 h-5 w-1/3 rounded-full bg-tile" />
    </div>
  )
}
