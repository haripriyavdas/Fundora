import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

export function Logo({ to = '/' }: { to?: string }) {
  const { t } = useTranslation()
  return (
    <Link to={to} className="inline-flex min-h-11 items-center gap-2 font-bold text-ink">
      <img src="/favicon.svg" alt="" width={28} height={28} />
      <span className="text-lg tracking-tight">{t('common.appName')}</span>
    </Link>
  )
}
