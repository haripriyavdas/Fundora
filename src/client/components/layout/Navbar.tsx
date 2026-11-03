import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { button } from '@/components/ui/button'
import { Container } from '@/components/ui/Container'
import { useSession } from '@/features/auth/session'
import { Logo } from './Logo'

export function Navbar() {
  const { t } = useTranslation()
  const session = useSession()

  return (
    <header className="border-b border-line bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav aria-label={t('nav.main')} className="flex items-center gap-1 sm:gap-2">
          {session.status === 'student' ? (
            <Link to="/dashboard" className={button.primary}>
              {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link to="/login" className={button.ghost}>
                {t('nav.login')}
              </Link>
              <Link to="/signup" className={button.primary}>
                {t('nav.signup')}
              </Link>
            </>
          )}
        </nav>
      </Container>
    </header>
  )
}
