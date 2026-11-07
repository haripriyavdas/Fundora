import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

/** Centred card used by every auth page. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col bg-surface px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <Logo />
      </div>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm animate-fade-up sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </main>
      <p className="mx-auto flex max-w-md items-start gap-2 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-info" />
        {t('footer.scam')}
      </p>
    </div>
  )
}
