import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Small caps label above a heading, e.g. "01 · Your profile". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-xs font-semibold tracking-[0.14em] text-muted uppercase', className)}>
      {children}
    </p>
  )
}

/** Eyebrow + display H1 + optional intro, used at the top of every page. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-2 text-4xl leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-5xl">
          {title}
        </h1>
        {intro && <p className="mt-3 max-w-2xl text-body">{intro}</p>}
      </div>
      {children}
    </header>
  )
}
