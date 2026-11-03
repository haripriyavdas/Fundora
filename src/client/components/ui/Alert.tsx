import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const styles = {
  error: { box: 'bg-not-bg text-not', Icon: AlertCircle },
  success: { box: 'bg-eligible-bg text-eligible', Icon: CheckCircle2 },
  info: { box: 'bg-info-bg text-info', Icon: Info },
}

/** Inline notice. Errors are announced to screen readers immediately. */
export function Alert({
  tone,
  children,
  className,
}: {
  tone: keyof typeof styles
  children: ReactNode
  className?: string
}) {
  const { box, Icon } = styles[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl px-4 py-3 text-sm animate-pop',
        box,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="text-ink">{children}</div>
    </div>
  )
}
