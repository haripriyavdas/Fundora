# Security, privacy and trust

Fundora holds income, caste category and disability data about students, so privacy is a launch requirement. India's **Digital Personal Data Protection Act, 2023** applies: collect only what's needed, get clear consent, let students see, export and delete their data. Have a faculty advisor or lawyer review the privacy notice before launch.

## Privacy

- Consent checkbox at sign-up linking the privacy notice; store `consentAt`.
- Collect only what matching needs. Documents are yes/no flags. **Never** collect Aadhaar numbers, bank account numbers, ID numbers or portal passwords.
- `familyIncome`, `category`, `disability` are encrypted at rest (AES-256-GCM, per-value IV, key in `FIELD_ENCRYPTION_KEY`). Decrypted only in memory for matching or to show the student their own profile.
- Only the student can read their profile; there are no other account types.
- `GET /account/export` and `DELETE /account` (removes everything except anonymised reports).
- Logs redact sensitive fields, passwords and cookies. Analytics (PostHog) gets page views and events only, never profile values, and respects Do Not Track.
- Atlas: encryption at rest on, network access limited to Render's outbound IPs plus team IPs for dev, backups on for prod.

## Application security

| Area | Control |
| --- | --- |
| Passwords | bcrypt cost 12, minimum 8 characters, checked against a small common-password list |
| Sessions | JWT in `fundora_session` cookie: httpOnly, Secure (prod), SameSite=Lax, 7-day expiry; `JWT_SECRET` ≥ 32 random bytes |
| CSRF | Same-origin + SameSite=Lax cookie; state-changing routes accept only `application/json` |
| Headers | `helmet()` with a CSP that allows only self, Google sign-in and PostHog; `Cross-Origin-Opener-Policy: same-origin-allow-popups` and `Referrer-Policy: strict-origin-when-cross-origin`, which Google's sign-in popup needs |
| Input | Zod on every body, param and query; `express.json({ limit: '100kb' })`; Mongoose `strictQuery`; never pass raw request objects into queries (blocks `$` operator injection) |
| Access | Every student route filters by `req.user.id`; another student's resources return 404 |
| Rate limits | auth 10/min/IP, report 5/hour/user, global 100/min/IP |
| Tokens | Verification and reset tokens are random 32 bytes, stored hashed (SHA-256), single use, expire (24 h / 1 h) |
| Errors | Generic messages to the client, details to Sentry |
| Secrets | Only in `.env` (git-ignored), Render env vars and GitHub Actions secrets. `.claude/settings.json` blocks Claude Code from reading `.env`. |
| Dependencies | `npm audit` in CI (fail on high); Dependabot weekly |
| Scheme data | No API can change schemes; the seed's DB credentials exist only in CI and teammates' local `.env` |

## Trust (protecting students from bad information and scams)

- Every scheme shows its official source and a "last verified" date; schemes not verified in 90 days show a "may be out of date" notice.
- Verified badge only for government sources and known foundations.
- A scam warning on the site and in emails: "Fundora never charges fees, never asks for passwords or OTPs, and every Apply button goes to the official website."
- Apply buttons link only to `portal.url`, reviewed in the scheme PR; links open with `rel="noopener noreferrer"`.
- Report-wrong-info form → `reports` collection + email to the team → fix by PR.
- Weekly link checker emails the team about dead official links.

## Before every PR

Run the `security-review` skill or check: no secrets committed · no sensitive field logged or sent to analytics · new routes validated and behind `requireAuth` · queries filtered by `req.user.id` · no new role/admin code · no form posts to scheme portals.
