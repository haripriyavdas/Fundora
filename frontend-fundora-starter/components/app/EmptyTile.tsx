import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Dashed card for an empty list: icon, title, what to do next. */
export function EmptyTile({
  Icon,
  title,
  text,
  children,
}: {
  Icon: LucideIcon
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-line-strong p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-tile text-ink">
        <Icon aria-hidden className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      {children}
    </div>
  )
}
