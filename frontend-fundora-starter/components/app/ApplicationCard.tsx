import { ExternalLink, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { SAVED_STAGES, type SavedScheme, type SavedStage, type Scheme } from '@shared/schemas'
import { button } from '@/components/ui/button'
import { remove, setStage } from '@/features/applications/store'
import { deadline, formatDate } from '@/features/schemes/format'
import { cn } from '@/lib/cn'
import { ModeChip } from './MatchChip'

/** One scheme in the tracker: name, award, deadline, a stage menu, apply and remove. */
export function ApplicationCard({
  item,
  scheme,
  today,
}: {
  item: SavedScheme
  scheme?: Scheme
  today: string
}) {
  const { t } = useTranslation()
  const stageId = useId()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setFailed(false)
    try {
      await action()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  const due = scheme && deadline(scheme, today)
  const name = scheme?.name ?? item.schemeId

  return (
    <article className="rounded-2xl border border-line bg-white p-5" aria-busy={busy}>
      {scheme ? (
        <>
          <h3 className="text-lg leading-snug font-bold text-ink">
            <Link to={`/schemes/${scheme.id}`} className="hover:underline">
              {scheme.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-muted">{scheme.provider}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ModeChip mode={scheme.mode} />
          </div>
          <p className="mt-3 font-bold text-ink">{scheme.amount}</p>
          {due && (
            <p
              className={cn(
                'mt-0.5 text-sm',
                due.soon && item.stage !== 'applied' ? 'font-semibold text-not' : 'text-muted',
              )}
            >
              {t(`schemes.deadline.${due.key}`, { date: due.date, count: due.count })}
            </p>
          )}
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold text-ink">{name}</h3>
          <p className="mt-1 text-sm text-muted">{t('applications.gone')}</p>
        </>
      )}

      <p className="mt-3 text-xs text-muted">
        {item.stage === 'applied' && item.appliedOn
          ? t('applications.appliedOn', { date: formatDate(item.appliedOn) })
          : t('applications.savedOn', { date: formatDate(item.savedOn) })}
      </p>
      {item.stage === 'renewal_due' && scheme?.renewal && (
        <p className="mt-2 text-sm text-body">{scheme.renewal.text}</p>
      )}

      <div className="mt-4">
        <label htmlFor={stageId} className="mb-1.5 block text-sm font-medium text-ink">
          {t('applications.stageLabel')}
        </label>
        <select
          id={stageId}
          value={item.stage}
          disabled={busy}
          onChange={(e) =>
            void run(async () => {
              await setStage(item.schemeId, e.target.value as SavedStage)
              setBusy(false)
            })
          }
          className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-accent focus:ring-2 focus:ring-tile focus:outline-none"
        >
          {SAVED_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {t(`applications.stages.${stage}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {scheme && (
          <a
            href={scheme.portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(button.primary, 'flex-1')}
          >
            {t('applications.openPortal')}
            <ExternalLink aria-hidden className="size-4" />
          </a>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => remove(item.schemeId))}
          className={button.secondary}
          aria-label={t('applications.removeFrom', { name })}
        >
          <Trash2 aria-hidden className="size-4" />
          {t('applications.remove')}
        </button>
      </div>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-not">
          {t('applications.actionError')}
        </p>
      )}
    </article>
  )
}
