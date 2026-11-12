import { buttonEmail } from './layout.js'

// Reminder emails name the scheme and the date only, never anything from the student's profile.

export const deadlineReminderEmail = (opts: {
  schemeName: string
  closesOn: string
  daysLeft: number
  url: string
}) =>
  buttonEmail({
    subject:
      opts.daysLeft === 1
        ? `Last day tomorrow: ${opts.schemeName}`
        : `${opts.daysLeft} days left: ${opts.schemeName}`,
    intro: `${opts.schemeName} closes on ${opts.closesOn}. You saved it on Fundora, so here's your reminder to finish your application on the official portal.`,
    button: 'See documents and steps',
    url: opts.url,
    outro:
      "Already applied? Mark it as Applied in My applications and we'll stop these reminders. You can turn reminder emails off there too.",
  })

export const renewalReminderEmail = (opts: { schemeName: string; url: string }) =>
  buttonEmail({
    subject: `Time to renew: ${opts.schemeName}`,
    intro: `Applications for ${opts.schemeName} have opened again. You applied last time, so check what you need to renew it on the official portal.`,
    button: 'See renewal details',
    url: opts.url,
    outro:
      'Renewal rules (like attendance or marks) are on the scheme page. You can turn reminder emails off in My applications.',
  })
