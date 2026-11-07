import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  ExternalLink,
  FileText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { button } from '@/components/ui/button'
import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'

const steps = [
  { key: 'profile', Icon: UserRound },
  { key: 'match', Icon: FileText },
  { key: 'apply', Icon: ExternalLink },
] as const

// Match states always show icon + word + colour
const states = [
  { key: 'eligible', Icon: CheckCircle2, style: 'bg-eligible-bg text-eligible' },
  { key: 'almost', Icon: CircleAlert, style: 'bg-almost-bg text-almost' },
  { key: 'not', Icon: CircleX, style: 'bg-not-bg text-not' },
] as const

const safety = ['official', 'noIds', 'encrypted', 'delete'] as const

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <>
      <section className="bg-white py-12 sm:py-20">
        <Container className="max-w-3xl text-center animate-fade-up">
          <p className="text-sm font-semibold text-brand">{t('home.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {t('home.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
            {t('home.subtitle')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/signup" className={cn(button.primary, 'min-h-12 px-6 text-base')}>
              {t('home.cta')}
            </Link>
            <Link to="/login" className={cn(button.secondary, 'min-h-12 px-6 text-base')}>
              {t('home.ctaSecondary')}
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">{t('home.free')}</p>
        </Container>
      </section>

      <section aria-labelledby="how-heading" className="py-12 sm:py-16">
        <Container>
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.howTitle')}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map(({ key, Icon }, i) => (
              <li key={key} className="rounded-2xl border border-line bg-white p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">
                  {i + 1}. {t(`home.steps.${key}.title`)}
                </h3>
                <p className="mt-1 text-sm text-muted">{t(`home.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="states-heading" className="bg-white py-12 sm:py-16">
        <Container>
          <h2 id="states-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.states.title')}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {states.map(({ key, Icon, style }) => (
              <li key={key} className="rounded-2xl border border-line bg-white p-5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
                    style,
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {t(`home.states.${key}`)}
                </span>
                <p className="mt-3 text-sm text-muted">{t(`home.states.${key}Reason`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="safety-heading" className="py-12 sm:py-16">
        <Container>
          <h2 id="safety-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.safetyTitle')}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {safety.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm"
              >
                <ShieldCheck aria-hidden className="size-5 shrink-0 text-eligible" />
                {t(`home.safety.${key}`)}
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
