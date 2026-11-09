import { cn } from '@/lib/cn'

/** Eyebrow label, big number, one-line description. `emphasis` is the red tile (first only). */
export function StatTile({
  label,
  value,
  description,
  emphasis = false,
}: {
  label: string
  value: string
  description: string
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6',
        emphasis ? 'border-brand bg-brand text-white' : 'border-line bg-white',
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold tracking-[0.14em] uppercase',
          emphasis ? 'text-white/85' : 'text-muted',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-5xl leading-none font-extrabold tracking-tight sm:text-[56px]',
          emphasis ? 'text-white' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className={cn('mt-3 text-sm', emphasis ? 'text-white/90' : 'text-muted')}>{description}</p>
    </div>
  )
}
