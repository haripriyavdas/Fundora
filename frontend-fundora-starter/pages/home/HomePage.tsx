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
import { Eyebrow } from '@/components/ui/Eyebrow'
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

const h2 = 'mt-2 text-3xl font-extrabold tracking-[-0.02em] sm:text-[32px]'

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <>
      <section className="py-12 sm:py-20">
        <Container className="grid items-center gap-10 animate-fade-up lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow>{t('home.eyebrow')}</Eyebrow>
            <h1 className="mt-3 text-[40px] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-[56px]">
              {t('home.title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-body">{t('home.subtitle')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={cn(button.primary, 'min-h-12 px-6')}>
                {t('home.cta')}
              </Link>
              <Link to="/login" className={cn(button.secondary, 'min-h-12 px-6')}>
                {t('home.ctaSecondary')}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">{t('home.free')}</p>
          </div>

          <div className="rounded-[20px] bg-brand p-6 text-white sm:p-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/85 uppercase">
              {t('home.howTitle')}
            </p>
            <ol className="mt-5 space-y-5">
              {steps.map(({ key, Icon }, i) => (
                <li key={key} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">
                      {i + 1}. {t(`home.steps.${key}.title`)}
                    </h2>
                    <p className="mt-1 text-sm text-white/90">{t(`home.steps.${key}.text`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section aria-labelledby="states-heading" className="py-12 sm:py-16">
        <Container>
          <Eyebrow>{t('home.states.eyebrow')}</Eyebrow>
          <h2 id="states-heading" className={h2}>
            {t('home.states.title')}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-3">
            {states.map(({ key, Icon, style }) => (
              <li key={key} className="rounded-2xl border border-line bg-white p-6">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
                    style,
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {t(`home.states.${key}`)}
                </span>
                <p className="mt-4 text-body">{t(`home.states.${key}Reason`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="safety-heading" className="py-12 sm:py-16">
        <Container>
          <Eyebrow>{t('home.safetyEyebrow')}</Eyebrow>
          <h2 id="safety-heading" className={h2}>
            {t('home.safetyTitle')}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {safety.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-line bg-white p-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tile text-ink">
                  <ShieldCheck aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <p className="pt-2 text-body">{t(`home.safety.${key}`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
