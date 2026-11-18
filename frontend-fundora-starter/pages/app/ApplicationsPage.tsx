import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { todayInIndia } from '@shared/dates'
import { SAVED_STAGES, type NotificationSettings } from '@shared/schemas'
import { ApplicationCard } from '@/components/app/ApplicationCard'
import { EmptyTile } from '@/components/app/EmptyTile'
import { Alert } from '@/components/ui/Alert'
import { button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/Eyebrow'
import { getNotificationSettings, updateNotificationSettings } from '@/features/applications/api'
import { useSaved } from '@/features/applications/store'
import { useSchemes } from '@/features/schemes/useSchemes'

/** The tracker: three columns, Saved, Applied and Renewal due. Nothing else. */
export default function ApplicationsPage() {
  const { t } = useTranslation()
  const { state: saved, retry } = useSaved()
  // Names, amounts and deadlines come from the scheme list
  const { state: schemes } = useSchemes()
  const today = todayInIndia()

  const header = (
    <PageHeader
      eyebrow={t('applications.eyebrow')}
      title={t('applications.title')}
      intro={t('applications.intro')}
    />
  )

  if (saved.status === 'loading' || schemes.status === 'loading') {
    return (
      <div className="space-y-8">
        {header}
        <div role="status" aria-label={t('common.loading')} className="grid gap-5 lg:grid-cols-3">
          {SAVED_STAGES.map((s) => (
            <div key={s} className="h-56 rounded-2xl bg-tile" />
          ))}
        </div>
      </div>
    )
  }
  if (saved.status === 'error') {
    return (
      <div className="space-y-6">
        {header}
        <div className="max-w-md space-y-4">
          <Alert tone="error">{t('applications.loadError')}</Alert>
          <button type="button" className={button.secondary} onClick={() => void retry()}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    )
  }

  const byId = new Map(schemes.status === 'ready' ? schemes.schemes.map((s) => [s.id, s]) : [])

  return (
    <div className="space-y-10 animate-fade-up">
      {header}

      {saved.items.length === 0 ? (
        <div className="max-w-xl">
          <EmptyTile
            Icon={Bookmark}
            title={t('applications.emptyTitle')}
            text={t('applications.emptyText')}
          >
            <Link to="/matches" className={button.ink}>
              {t('applications.findSchemes')}
            </Link>
          </EmptyTile>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {SAVED_STAGES.map((stage) => {
            const items = saved.items.filter((i) => i.stage === stage)
            return (
              <section key={stage} aria-labelledby={`col-${stage}`} className="min-w-0">
                <h2
                  id={`col-${stage}`}
                  className="flex items-center gap-2 text-lg font-extrabold text-ink"
                >
                  {t(`applications.stages.${stage}`)}
                  <span className="rounded-full bg-tile px-2 py-0.5 text-sm font-semibold text-body">
                    {items.length}
                  </span>
                </h2>
                <div className="mt-3 space-y-4">
                  {items.length === 0 ? (
                    <p className="rounded-2xl border-2 border-dashed border-line-strong p-5 text-sm text-muted">
                      {t(`applications.columnEmpty.${stage}`)}
                    </p>
                  ) : (
                    items.map((item) => (
                      <ApplicationCard
                        key={item.schemeId}
                        item={item}
                        scheme={byId.get(item.schemeId)}
                        today={today}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <ReminderSettings />
    </div>
  )
}

/** Two switches for reminder emails. Saves on change. */
function ReminderSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getNotificationSettings().then(setSettings, () => setFailed(true))
  }, [])

  async function change(key: keyof NotificationSettings, value: boolean) {
    setFailed(false)
    try {
      setSettings(await updateNotificationSettings({ [key]: value }))
    } catch {
      setFailed(true)
    }
  }

  return (
    <section
      aria-labelledby="reminders-heading"
      className="max-w-xl rounded-2xl border border-line bg-white p-6"
    >
      <h2 id="reminders-heading" className="text-xl font-bold">
        {t('applications.reminders.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('applications.reminders.intro')}</p>
      {settings && (
        <div className="mt-4 space-y-1">
          {(['deadlineEmails', 'renewalEmails'] as const).map((key) => (
            <label key={key} className="flex min-h-11 items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => void change(key, e.target.checked)}
                className="mt-1 size-5 accent-accent"
              />
              <span>
                <span className="block font-semibold text-ink">
                  {t(`applications.reminders.${key}`)}
                </span>
                <span className="block text-sm text-muted">
                  {t(`applications.reminders.${key}Text`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-sm text-not">
          {t('applications.reminders.error')}
        </p>
      )}
    </section>
  )
}
