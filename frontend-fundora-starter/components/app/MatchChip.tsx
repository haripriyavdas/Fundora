import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MatchState } from '@shared/schemas'
import { cn } from '@/lib/cn'

const styles: Record<MatchState, { Icon: LucideIcon; className: string }> = {
  eligible: { Icon: CheckCircle2, className: 'bg-eligible-bg text-eligible' },
  almost: { Icon: AlertTriangle, className: 'bg-almost-bg text-almost' },
  not: { Icon: XCircle, className: 'bg-not-bg text-not' },
  unknown: { Icon: HelpCircle, className: 'bg-info-bg text-info' },
}

/** Match state as icon + word + colour, never colour alone. */
export function MatchChip({ state }: { state: MatchState }) {
  const { t } = useTranslation()
  const { Icon, className } = styles[state]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {t(`schemes.match.${state}`)}
    </span>
  )
}

/** Online only / Online + offline. */
export function ModeChip({ mode }: { mode: 'online' | 'onlineAndOffline' }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        mode === 'online' ? 'bg-tile text-body' : 'bg-accent text-on-accent',
      )}
    >
      {t(`schemes.mode.${mode}`)}
    </span>
  )
}
