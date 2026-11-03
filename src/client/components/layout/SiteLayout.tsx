import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

/** Public pages: navbar, page, footer with the scam warning. */
export function SiteLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        {t('common.skipToContent')}
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
