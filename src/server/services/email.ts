import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { resetPasswordEmail, verifyEmail } from './email-templates/auth.js'
import type { EmailContent } from './email-templates/layout.js'
import { deadlineReminderEmail, renewalReminderEmail } from './email-templates/reminders.js'

export type OutgoingEmail = EmailContent & { to: string }
export type EmailTransport = (email: OutgoingEmail) => Promise<void>

const resend: EmailTransport = async ({ to, subject, html, text }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}`)
}

const brevo: EmailTransport = async ({ to, subject, html, text }) => {
  const match = /^(.*)<(.+)>$/.exec(env.EMAIL_FROM)
  const sender = match
    ? { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() }
    : { email: env.EMAIL_FROM }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.EMAIL_API_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  })
  if (!res.ok) throw new Error(`Brevo responded ${res.status}`)
}

// Dev only (env.ts refuses it in production): prints the email so links can be clicked locally.
const consoleTransport: EmailTransport = async ({ to, subject, text }) => {
  logger.info(`\n--- email to ${to} ---\nSubject: ${subject}\n\n${text}\n---`)
}

/** Messages captured by the in-memory stub transport (tests). */
export const outbox: OutgoingEmail[] = []
const stubTransport: EmailTransport = async (email) => {
  outbox.push(email)
}

let transport: EmailTransport =
  env.NODE_ENV === 'test'
    ? stubTransport
    : { resend, brevo, console: consoleTransport }[env.EMAIL_PROVIDER]

/** Replace the transport (tests). */
export function setEmailTransport(t: EmailTransport) {
  transport = t
}

async function send(email: OutgoingEmail) {
  try {
    await transport(email)
  } catch (err) {
    // Never fail the request because the email provider is down; the student can resend.
    logger.error({ err, subject: email.subject }, 'email send failed')
  }
}

const link = (path: string, token: string) =>
  `${env.APP_URL}${path}?token=${encodeURIComponent(token)}`

export const sendVerificationEmail = (to: string, token: string) =>
  send({ to, ...verifyEmail(link('/verify-email', token)) })

export const sendPasswordResetEmail = (to: string, token: string) =>
  send({ to, ...resetPasswordEmail(link('/reset-password', token)) })

const schemeUrl = (schemeId: string) => `${env.APP_URL}/schemes/${encodeURIComponent(schemeId)}`

export const sendDeadlineReminder = (
  to: string,
  scheme: { id: string; name: string },
  closesOn: string,
  daysLeft: number,
) =>
  send({
    to,
    ...deadlineReminderEmail({
      schemeName: scheme.name,
      closesOn,
      daysLeft,
      url: schemeUrl(scheme.id),
    }),
  })

export const sendRenewalReminder = (to: string, scheme: { id: string; name: string }) =>
  send({ to, ...renewalReminderEmail({ schemeName: scheme.name, url: schemeUrl(scheme.id) }) })
