export type EmailContent = { subject: string; html: string; text: string }

export const SCAM_WARNING =
  'Fundora never charges fees, never asks for passwords or OTPs, and every Apply button goes to the official website.'

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Plain, single-column email with one button and the scam warning in the footer. */
export function buttonEmail(opts: {
  subject: string
  intro: string
  button: string
  url: string
  outro: string
}): EmailContent {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#1c2333">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:20px;font-weight:bold;margin:0 0 24px">Fundora</p>
<p style="font-size:16px;line-height:1.5">${escape(opts.intro)}</p>
<p style="margin:28px 0"><a href="${escape(opts.url)}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block">${escape(opts.button)}</a></p>
<p style="font-size:14px;line-height:1.5;color:#5b6475">${escape(opts.outro)}</p>
<p style="font-size:13px;line-height:1.5;color:#5b6475;word-break:break-all">${escape(opts.url)}</p>
<hr style="border:none;border-top:1px solid #e3e6ee;margin:28px 0">
<p style="font-size:12px;line-height:1.5;color:#5b6475">${escape(SCAM_WARNING)}</p>
</div></body></html>`
  const text = `${opts.intro}\n\n${opts.button}: ${opts.url}\n\n${opts.outro}\n\n--\n${SCAM_WARNING}`
  return { subject: opts.subject, html, text }
}
