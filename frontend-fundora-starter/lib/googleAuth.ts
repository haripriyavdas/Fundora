// Google Identity Services: Google's own sign-in button. It hands us a signed ID token, which the
// server checks (POST /auth/google). We never see or keep the student's Google password.

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

type CredentialResponse = { credential?: string }
type ButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'pill' | 'rectangular'
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  width?: number
  locale?: string
}
type GoogleAccountsId = {
  initialize(options: {
    client_id: string
    callback: (response: CredentialResponse) => void
    ux_mode?: 'popup'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }): void
  renderButton(parent: HTMLElement, options: ButtonOptions): void
  disableAutoSelect(): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleAccountsId> | null = null

/** Loads Google's script once and resolves with its sign-in API. */
export function loadGoogle(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gsi'))
    script.onerror = () => {
      loading = null // let a later visit try again
      script.remove()
      reject(new Error('gsi'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export type { CredentialResponse }
