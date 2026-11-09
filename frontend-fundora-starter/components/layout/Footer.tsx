import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/ui/Container'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-auto bg-accent py-10 text-sm text-on-accent-muted">
      <Container className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Logo onDark />
            <p>{t('footer.tagline')}</p>
          </div>
          <div className="max-w-md rounded-2xl border border-white/15 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase">
              {t('app.guideNoteTitle')}
            </p>
            <p className="mt-2 flex items-start gap-2 text-on-accent">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
              {t('footer.scam')}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">{t('footer.made')}</p>
          <nav aria-label={t('footer.legal')} className="flex gap-4">
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-on-accent">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-on-accent">
              {t('footer.terms')}
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  )
}
