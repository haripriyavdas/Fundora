import { Bookmark, ListChecks, Search, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { EmptyTile } from '@/components/app/EmptyTile'
import { button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/Eyebrow'

const icons: Record<Area, LucideIcon> = {
  matches: ListChecks,
  applications: Bookmark,
  browse: Search,
}

type Area = 'matches' | 'applications' | 'browse'

/** Logged-in pages whose data (schemes, matches, tracker) doesn't exist yet. */
export default function ComingSoonPage({ area }: { area: Area }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        eyebrow={t(`comingSoon.${area}.eyebrow`)}
        title={t(`comingSoon.${area}.title`)}
        intro={t(`comingSoon.${area}.intro`)}
      >
        <span className="inline-flex w-fit items-center rounded-full bg-tile px-3 py-1 text-xs font-semibold tracking-[0.14em] text-body uppercase">
          {t('comingSoon.badge')}
        </span>
      </PageHeader>
      <div className="max-w-xl">
        <EmptyTile
          Icon={icons[area]}
          title={t(`comingSoon.${area}.emptyTitle`)}
          text={t(`comingSoon.${area}.emptyText`)}
        >
          {area === 'applications' && (
            <p className="text-sm text-muted">{t('comingSoon.applications.stages')}</p>
          )}
          <Link to="/profile" className={button.primary}>
            {t('comingSoon.profileCta')}
          </Link>
        </EmptyTile>
      </div>
    </div>
  )
}
