import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { daysBetween, todayInIndia } from '@shared/dates'
import type { RuleResult, Scheme } from '@shared/schemas'
import { MatchChip, ModeChip } from '@/components/app/MatchChip'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { save, useSaved } from '@/features/applications/store'
import { useSession } from '@/features/auth/session'
import { deadline, domainOf, formatDate } from '@/features/schemes/format'
import { useScheme } from '@/features/schemes/useSchemes'
import { cn } from '@/lib/cn'

/** Details older than this get a "may be out of date" notice (docs/security.md). */
const STALE_AFTER_DAYS = 90

const resultStyles: Record<RuleResult, { Icon: LucideIcon; className: string }> = {
  met: { Icon: CheckCircle2, className: 'text-eligible' },
  near: { Icon: AlertTriangle, className: 'text-almost' },
  notMet: { Icon: XCircle, className: 'text-not' },
  unknown: { Icon: HelpCircle, className: 'text-info' },
}

/** The full scheme page. Public; a signed-in student also sees how they match each rule. */
export default function SchemePage() {
  const { t } = useTranslation()
  const { schemeId = '' } = useParams()
  const { state, retry } = useScheme(schemeId)

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label={t('common.loading')} className="space-y-6">
        <div className="h-64 rounded-[20px] bg-tile" />
        <div className="h-40 rounded-2xl bg-white" />
      </div>
    )
  }
  if (state.status === 'notFound') {
    return (
      <div className="max-w-md space-y-4 animate-fade-up">
        <h1 className="text-3xl font-extrabold">{t('scheme.notFoundTitle')}</h1>
        <p className="text-body">{t('scheme.notFoundText')}</p>
        <Link to="/browse" className={button.primary}>
          {t('scheme.browseAll')}
        </Link>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="max-w-md space-y-4">
        <Alert tone="error">{t('scheme.loadError')}</Alert>
        <button type="button" className={button.secondary} onClick={retry}>
          {t('common.retry')}
        </button>
      </div>
    )
  }
  return <SchemeDetails scheme={state.scheme} />
}

function SchemeDetails({ scheme }: { scheme: Scheme }) {
  const { t } = useTranslation()
  const session = useSession()
  const student = session.status === 'student'
  const today = todayInIndia()
  const due = deadline(scheme, today)
  const stale = daysBetween(scheme.verifiedOn, today) > STALE_AFTER_DAYS

  const sections = [
    { id: 'eligibility', show: true },
    { id: 'about', show: !!scheme.about || !!scheme.benefits?.length },
    { id: 'documents', show: true },
    { id: 'steps', show: true },
    { id: 'offline', show: !!scheme.offline },
    { id: 'renewal', show: !!scheme.renewal },
    { id: 'officialDocuments', show: !!scheme.officialDocuments?.length },
    { id: 'importantDates', show: !!scheme.importantDates?.length },
    { id: 'helpline', show: !!scheme.helpline },
  ].filter((s) => s.show)

  return (
    <div className="space-y-8 animate-fade-up">
      <Link
        to={student ? '/matches' : '/browse'}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t(student ? 'scheme.backMatches' : 'scheme.browseAll')}
      </Link>

      {/* Red hero: type, name, chips, fact strip */}
      <header className="rounded-[20px] bg-brand p-6 text-white sm:p-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-white/85 uppercase">
          {t(`schemes.aidType.${scheme.aidType}`)} ·{' '}
          {t(`schemes.providerType.${scheme.providerType}`)}
        </p>
        <h1 className="mt-3 text-3xl leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-5xl">
          {scheme.name}
        </h1>
        <p className="mt-2 text-white/90">{scheme.provider}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {student && <MatchChip state={scheme.match.state} />}
          <ModeChip mode={scheme.mode} />
        </div>
        <dl className="mt-6 grid gap-4 border-t border-white/25 pt-5 sm:grid-cols-3">
          <Fact label={t('scheme.award')}>{scheme.amount}</Fact>
          <Fact label={t('scheme.deadline')}>
            {t(`schemes.deadline.${due.key}`, { date: due.date, count: due.count })}
          </Fact>
          <Fact label={t('scheme.howToSubmit')}>{t(`scheme.submit.${scheme.mode}`)}</Fact>
        </dl>
      </header>

      {stale && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('scheme.stale')}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section id="eligibility" title={t('scheme.sections.eligibility')}>
            {student && scheme.eligibility ? (
              <>
                <p className="text-body">{scheme.match.reason}</p>
                <ul className="mt-4 divide-y divide-line-soft">
                  {scheme.eligibility.map((rule, i) => {
                    const { Icon, className } = resultStyles[rule.result]
                    return (
                      <li key={i} className="flex gap-3 py-3">
                        <Icon
                          aria-hidden
                          className={cn('mt-0.5 size-5 shrink-0', className)}
                          strokeWidth={1.75}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                            <p className="font-semibold text-ink">{rule.rule}</p>
                            {rule.result === 'unknown' ? (
                              <Link
                                to="/profile"
                                className="text-sm font-semibold text-info underline"
                              >
                                {t('scheme.result.unknown')}
                              </Link>
                            ) : (
                              <p className={cn('text-sm font-semibold', className)}>
                                {t(`scheme.result.${rule.result}`)}
                              </p>
                            )}
                          </div>
                          {rule.result !== 'met' && (
                            <p className="mt-1 text-sm text-body">{rule.text}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <Alert tone="info">
                {t('scheme.loginToCheck')}{' '}
                <Link
                  to="/login"
                  state={{ from: `/schemes/${scheme.id}` }}
                  className="font-semibold underline"
                >
                  {t('nav.login')}
                </Link>
              </Alert>
            )}
            {!!scheme.eligibilityText?.length && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-ink">
                  {t('scheme.officialWording')}
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
                  {scheme.eligibilityText.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          {(scheme.about || !!scheme.benefits?.length) && (
            <Section id="about" title={t('scheme.sections.about')}>
              {scheme.about && <p className="text-body">{scheme.about}</p>}
              {!!scheme.benefits?.length && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-body">
                  {scheme.benefits.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          <Section id="documents" title={t('scheme.sections.documents')}>
            <ul className="divide-y divide-line-soft">
              {scheme.documents.map((doc) => (
                <li key={doc.id} className="py-3">
                  <p className="font-semibold text-ink">{doc.name}</p>
                  {doc.note && <p className="text-sm text-muted">{doc.note}</p>}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="steps" title={t('scheme.sections.steps')}>
            <ol className="space-y-4">
              {scheme.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{step.title}</p>
                    <p className="text-sm text-body">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {scheme.offline && (
            <Section id="offline" title={t('scheme.sections.offline')}>
              <p className="text-body">{scheme.offline.summary}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label={t('scheme.offlineWhere')}>{scheme.offline.where}</Detail>
                <Detail label={t('scheme.offlineWhen')}>{scheme.offline.when}</Detail>
              </dl>
              <p className="mt-4 text-sm font-semibold text-ink">{t('scheme.offlineCarry')}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-body">
                {scheme.offline.carry.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              {scheme.offline.tip && (
                <p className="mt-4 text-sm text-muted">{scheme.offline.tip}</p>
              )}
            </Section>
          )}

          {scheme.renewal && (
            <Section id="renewal" title={t('scheme.sections.renewal')}>
              <p className="text-body">{scheme.renewal.text}</p>
            </Section>
          )}

          {!!scheme.officialDocuments?.length && (
            <Section id="officialDocuments" title={t('scheme.sections.officialDocuments')}>
              <ul className="space-y-2">
                {scheme.officialDocuments.map((doc) => (
                  <li key={doc.url}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      <FileText aria-hidden className="size-4 shrink-0" />
                      {doc.title}
                      <span className="text-sm font-normal text-muted uppercase">{doc.format}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {!!scheme.importantDates?.length && (
            <Section id="importantDates" title={t('scheme.sections.importantDates')}>
              <dl className="divide-y divide-line-soft">
                {scheme.importantDates.map((d) => (
                  <div key={d.label + d.date} className="flex justify-between gap-4 py-2">
                    <dt className="text-body">{d.label}</dt>
                    <dd className="font-semibold text-ink">{formatDate(d.date)}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {scheme.helpline && (
            <Section id="helpline" title={t('scheme.sections.helpline')}>
              <dl className="grid gap-3 sm:grid-cols-3">
                {scheme.helpline.phone && (
                  <Detail label={t('scheme.phone')}>
                    <a href={`tel:${scheme.helpline.phone}`} className="underline">
                      {scheme.helpline.phone}
                    </a>
                  </Detail>
                )}
                {scheme.helpline.email && (
                  <Detail label={t('scheme.email')}>
                    <a href={`mailto:${scheme.helpline.email}`} className="break-all underline">
                      {scheme.helpline.email}
                    </a>
                  </Detail>
                )}
                {scheme.helpline.hours && (
                  <Detail label={t('scheme.hours')}>{scheme.helpline.hours}</Detail>
                )}
              </dl>
            </Section>
          )}

          <p className="text-sm text-muted">
            {t('scheme.verified', { date: formatDate(scheme.verifiedOn) })}{' '}
            <a
              href={scheme.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline"
            >
              {t('scheme.source')}
            </a>
          </p>
        </div>

        {/* Apply column: sticky on desktop, first after the hero's content on phones */}
        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-6">
            <a
              href={scheme.portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(button.primary, 'w-full')}
            >
              {t('scheme.apply')}
              <ExternalLink aria-hidden className="size-4" />
            </a>
            <p className="mt-3 text-xs text-muted">
              {t('scheme.applyNote', { domain: domainOf(scheme.portal.url) })}
            </p>
            <p className="mt-3 text-xs text-muted">{t('scheme.verifyNote')}</p>
            <div className="mt-4 border-t border-line-soft pt-4">
              {student ? (
                <SaveButton schemeId={scheme.id} />
              ) : (
                <Link
                  to="/login"
                  state={{ from: `/schemes/${scheme.id}` }}
                  className={cn(button.secondary, 'w-full')}
                >
                  <Bookmark aria-hidden className="size-4" />
                  {t('scheme.loginToSave')}
                </Link>
              )}
            </div>
          </div>
          <nav
            aria-label={t('scheme.onThisPage')}
            className="hidden rounded-2xl border border-line bg-white p-6 lg:block"
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              {t('scheme.onThisPage')}
            </p>
            <ul className="mt-3 space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block py-1 text-sm text-body hover:text-ink hover:underline"
                  >
                    {t(`scheme.sections.${s.id}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-white/80 uppercase">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{children}</dd>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 rounded-2xl border border-line bg-white p-6"
    >
      <h2 id={`${id}-heading`} className="text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Adds the scheme to My applications, or shows that it's already there. */
function SaveButton({ schemeId }: { schemeId: string }) {
  const { t } = useTranslation()
  const { state } = useSaved()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const item =
    state.status === 'ready' ? state.items.find((i) => i.schemeId === schemeId) : undefined

  if (item) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <BookmarkCheck aria-hidden className="size-4 text-eligible" />
          {t('scheme.savedAs', { stage: t(`applications.stages.${item.stage}`) })}
        </p>
        <Link to="/applications" className={cn(button.secondary, 'w-full')}>
          {t('scheme.openTracker')}
        </Link>
      </div>
    )
  }

  async function onSave() {
    setBusy(true)
    setFailed(false)
    try {
      await save(schemeId)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={busy || state.status !== 'ready'}
        className={cn(button.ink, 'w-full')}
      >
        <Bookmark aria-hidden className="size-4" />
        {t('scheme.save')}
      </button>
      <p className="mt-2 text-xs text-muted">{t('scheme.saveNote')}</p>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-not">
          {t('scheme.saveError')}
        </p>
      )}
    </>
  )
}
