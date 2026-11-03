# Deployment

## Environments

| Env | Where | Database | Deploys |
| --- | --- | --- | --- |
| local | `npm run dev` on your laptop | `fundora_dev` on Atlas (shared) or local MongoDB | — |
| staging (optional) | Render web service `fundora-staging` | `fundora_staging` | auto from `main` |
| production | Render web service `fundora` | `fundora_prod` | manual promote or tagged release |

## Render web service

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/v1/health`
- Node 20 (set `engines.node` in `package.json`)
- Free tier sleeps after inactivity (slow first load, jobs pause). Use the Starter plan, or move jobs to a Render Cron Job, before public launch.

## Environment variables

| Name | Required | Example / notes |
| --- | --- | --- |
| `NODE_ENV` | ✓ | `development` / `production` / `test` |
| `PORT` | | `3000` |
| `APP_URL` | ✓ | `http://localhost:3000`, used in email links |
| `MONGODB_URI` | ✓ | Atlas connection string including the db name |
| `JWT_SECRET` | ✓ | 32+ random bytes (`openssl rand -base64 48`) |
| `FIELD_ENCRYPTION_KEY` | ✓ | 32 bytes base64 (`openssl rand -base64 32`). Losing it makes encrypted fields unreadable, so back it up in a password manager. |
| `EMAIL_PROVIDER` | ✓ | `resend` or `brevo`; `console` (local dev only, refused in production) prints emails and their links to the terminal |
| `EMAIL_API_KEY` | ✓* | provider key (*not needed with `console`) |
| `EMAIL_FROM` | ✓ | `Fundora <hello@yourdomain>` |
| `TEAM_INBOX` | ✓ | where reports and link-check emails go |
| `GOOGLE_CLIENT_ID` | | enables Google sign-in (server + `VITE_GOOGLE_CLIENT_ID`) |
| `SENTRY_DSN` | | error tracking |
| `VITE_USE_MOCK_DATA` | | `true` until the API is ready; `false` in prod |
| `VITE_POSTHOG_KEY` | | analytics |
| `MDB_MCP_CONNECTION_STRING` | dev only | MongoDB MCP server for Claude Code; `fundora_dev` user only. Keep it in your shell, not `.env` |

`VITE_*` variables are baked into the client at build time and are public. Never put secrets in them.

## CI (`.github/workflows/ci.yml`)

On every PR: install → lint → typecheck → `validate-schemes` → `npm test` → build → `npm audit --audit-level=high`. On PRs to `main` it also runs Playwright. On push to `main`: validate, then `npm run seed` with the `MONGODB_URI_PROD` secret. Render deploys the new commit itself.

GitHub secrets: `MONGODB_URI_PROD` (a user with write access to `schemes` only, if you want to be strict), plus anything e2e needs.

## Costs (approximate, check current free tiers)

| Item | Cost |
| --- | --- |
| Atlas M0, Render free, Resend/Brevo free, Sentry/UptimeRobot/PostHog free | ₹0 |
| Domain (.in / .com) | ₹500–1,000 a year |
| Before launch: Render Starter (+ Atlas M10 if traffic grows) | roughly ₹600–5,000 a month |

## Launch checklist

- [ ] All env vars set in Render; `FIELD_ENCRYPTION_KEY` backed up
- [ ] Atlas prod backups on, network access restricted
- [ ] 100 verified schemes seeded
- [ ] Privacy notice and terms reviewed
- [ ] Sentry + UptimeRobot on `/api/v1/health`
- [ ] Pilot with 30–50 BMSCE students done, wrong matches fixed
- [ ] Lighthouse mobile ≥ 85 performance, ≥ 95 accessibility
