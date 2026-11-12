import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { button } from '@/components/ui/button'
import { googleSignIn } from '@/features/auth/api'
import { setStudent } from '@/features/auth/session'
import { GOOGLE_CLIENT_ID, loadGoogle } from '@/lib/googleAuth'
import { cn } from '@/lib/cn'

type Props = {
  mode: 'signin' | 'signup'
  /** Where to go after signing in. */
  to: string
  /** Signup only: the privacy box is ticked. Google can't create an account without it. */
  consent?: boolean
  /** Called with the API error, so the page shows it in its own error box. */
  onError: (err: unknown) => void
  onBusy?: (busy: boolean) => void
}

/** Google's own "Sign in with Google" button. Renders nothing if Google sign-in isn't set up. */
export function GoogleButton({ mode, to, consent, onError, onBusy }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const slot = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const needsConsent = mode === 'signup' && !consent

  // Keep the latest props for Google's callback, which is registered once per render of the button
  const latest = useRef({ to, consent, onError, onBusy, navigate })
  useEffect(() => {
    latest.current = { to, consent, onError, onBusy, navigate }
  })

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || needsConsent) return
    let cancelled = false
    loadGoogle().then(
      (google) => {
        if (cancelled || !slot.current) return
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          auto_select: false,
          callback: async ({ credential }) => {
            const { to, consent, onError, onBusy, navigate } = latest.current
            if (!credential) return
            onBusy?.(true)
            try {
              const { user } = await googleSignIn({
                idToken: credential,
                ...(mode === 'signup' && consent ? { consent: true as const } : {}),
              })
              setStudent(user)
              navigate(to, { replace: true })
            } catch (err) {
              onError(err)
              onBusy?.(false)
            }
          },
        })
        slot.current.replaceChildren()
        google.renderButton(slot.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          width: Math.min(400, Math.max(200, slot.current.offsetWidth)),
          locale: i18n.language,
        })
      },
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [mode, needsConsent, i18n.language])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className="space-y-2">
      {needsConsent ? (
        <>
          <button type="button" disabled className={cn(button.secondary, 'w-full')}>
            {t('auth.google.signup')}
          </button>
          <p className="text-center text-xs text-muted">{t('auth.google.consentFirst')}</p>
        </>
      ) : failed ? (
        <p role="status" className="text-center text-sm text-muted">
          {t('auth.google.unavailable')}
        </p>
      ) : (
        // Google draws its button in here; min height stops the layout jumping while it loads
        <div ref={slot} className="flex min-h-11 w-full justify-center" />
      )}
    </div>
  )
}

/** "or" between the Google button and the email form. */
export function OrDivider() {
  const { t } = useTranslation()
  if (!GOOGLE_CLIENT_ID) return null
  return (
    <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
      <span className="h-px flex-1 bg-line" />
      {t('auth.orSeparator')}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
