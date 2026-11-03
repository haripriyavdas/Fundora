import { buttonEmail } from './layout.js'

export const verifyEmail = (url: string) =>
  buttonEmail({
    subject: 'Confirm your email for Fundora',
    intro:
      'Welcome to Fundora! Please confirm your email address so we can send you scholarship deadline reminders.',
    button: 'Confirm my email',
    url,
    outro:
      "This link works for 24 hours. If you didn't create a Fundora account, you can ignore this email.",
  })

export const resetPasswordEmail = (url: string) =>
  buttonEmail({
    subject: 'Reset your Fundora password',
    intro:
      'Someone asked to reset the password for your Fundora account. Click below to choose a new one.',
    button: 'Choose a new password',
    url,
    outro:
      "This link works for 1 hour and can be used once. If you didn't ask for this, ignore this email; your password stays the same.",
  })
