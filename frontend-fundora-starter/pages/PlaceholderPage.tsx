import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { button } from '@/components/ui/button'
import { Container } from '@/components/ui/Container'

/** Static pages that aren't written yet, and the 404 page. */
export default function PlaceholderPage({
  titleKey,
  bodyKey,
}: {
  titleKey: string
  bodyKey: string
}) {
  const { t } = useTranslation()
  return (
    <Container className="max-w-2xl py-16">
      <h1 className="text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl">{t(titleKey)}</h1>
      <p className="mt-3 text-body">{t(bodyKey)}</p>
      <Link to="/" className={`${button.secondary} mt-8`}>
        {t('common.backHome')}
      </Link>
    </Container>
  )
}
