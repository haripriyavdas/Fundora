import { Asterisk } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/** Red asterisk mark + wordmark. `onDark` is for the charcoal sidebar. */
export function Logo({ to = '/', onDark = false }: { to?: string; onDark?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex min-h-11 items-center gap-2.5 font-extrabold',
        onDark ? 'text-on-accent' : 'text-ink',
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
        <Asterisk aria-hidden className="size-5" strokeWidth={2.5} />
      </span>
      <span className="text-xl tracking-tight">{t('common.appName')}</span>
    </Link>
  )
}
