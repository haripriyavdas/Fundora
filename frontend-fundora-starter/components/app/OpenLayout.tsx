import { useTranslation } from 'react-i18next'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { useSession } from '@/features/auth/session'
import { AppLayout } from './AppLayout'

/**
 * For pages anyone can see (browse, scheme details): the student shell when signed in, the
 * public site shell otherwise. Never sends a visitor to /login.
 */
export function OpenLayout() {
  const { t } = useTranslation()
  const session = useSession()
  if (session.status === 'loading') {
    return (
      <p role="status" className="p-8 text-center text-muted">
        {t('common.loading')}
      </p>
    )
  }
  return session.status === 'student' ? <AppLayout /> : <SiteLayout padded />
}
