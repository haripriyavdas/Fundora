import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/ui/Container'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-auto border-t border-line bg-white py-8 text-sm text-muted">
      <Container className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl bg-info-bg px-4 py-3 text-ink">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          {t('footer.scam')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.tagline')}</p>
          <nav className="flex gap-4">
            <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-ink">
              {t('footer.privacy')}
            </Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-ink">
              {t('footer.terms')}
            </Link>
          </nav>
        </div>
        <p className="text-xs">{t('footer.made')}</p>
      </Container>
    </footer>
  )
}
