# Architecture

As of 2026-11-03. Fundora is one MERN codebase in one folder: a React app, an Express API and shared TypeScript, served by a single Node process and backed by MongoDB Atlas.

## Scope

**v1 does**
- Student sign-up (email + password, optional Google), email verification, a 5-step profile
- Scheme database across 19 UG course categories: scholarships, education loans, fee waivers, laptop/book grants, hostel/travel support, exam/coaching support, and schemes for girls, disabled and rural students
- Eligibility matching with three result states plus `unknown`, each with a reason ("You are ₹30,000 above the income limit")
- Scheme page: amount, deadline, documents checklist, steps, offline submission details, official documents, last-verified date, official portal link
- Tracker with three stages (Saved, Applied, Renewal due) and email reminders for deadlines and renewals
- Trust: verified-source badges, scam warnings, report-wrong-info
- Guides (NSP registration, Aadhaar–bank seeding, income/caste certificates) and success stories as Markdown

**Never:** fill or submit forms, hold portal logins, process payments, charge fees, admin/counsellor/NGO accounts.

**v2:** internships (virtual, summer, NGO/research, open source, campus ambassador), skill matching, resume builder.

## System

```
                         one Render web service (Node 20)
 Student ──HTTPS──► ┌──────────────────────────────────────────────┐
 (phone browser)    │ Express                                       │
                    │  ├─ /api/v1/*  auth · profile · schemes ·     │
                    │  │             saved · reports · account      │
                    │  │     └─ uses src/shared/eligibility          │
                    │  ├─ jobs: reminders (daily), link check (weekly)│
                    │  └─ /*  React app (dist/client, SPA fallback)  │
                    └───────┬──────────────────────┬────────────────┘
                            │ Mongoose             │ HTTPS
                            ▼                      ▼
                     MongoDB Atlas           Resend / Brevo (email)
                     (7 collections)
                            ▲
 data/schemes/*.json ─PR review─► GitHub Actions: validate → seed on merge

 Student clicks "Apply" ──► official portal (NSP, SSP, foundation site)
```

**Why one service:** the API and the site share one origin, so cookies work without CORS, there is one deploy, one set of logs and one free-tier instance.

## Request flow: getting matches

1. Student saves profile → `PUT /api/v1/profile` → profile stored (sensitive fields encrypted), `profileVersion` bumped.
2. Student opens Matches → `GET /api/v1/schemes` → server loads active schemes (Mongo prefilter on level, course, state), decrypts the profile in memory, runs `evaluate()` per scheme, caches results in `matchResults` keyed by `profileVersion` + `dataVersion`.
3. Response: each scheme with `match: { state, reason, score }`; the client sorts and filters.
4. Student clicks Apply → new tab on `scheme.portal.url`. Fundora's part ends there; the student can mark it Applied in the tracker.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18, Vite, Tailwind CSS v4, React Router v7, lucide-react, react-i18next |
| Forms | React Hook Form + Zod resolver (profile wizard) |
| API | Node 20, Express, Zod validation, helmet, express-rate-limit, cookie-parser |
| Data | MongoDB Atlas, Mongoose |
| Auth | bcrypt, JWT in httpOnly cookie; optional Google sign-in (google-auth-library) |
| Email | Resend or Brevo |
| Jobs | node-cron (in the same process) |
| Shared | TypeScript + Zod in `src/shared` |
| Tests | Vitest, Supertest, Playwright, mongodb-memory-server |
| Quality | ESLint, Prettier, Husky + lint-staged |
| CI/CD | GitHub Actions; Render auto-deploy from `main` |
| Monitoring | Sentry, UptimeRobot, PostHog (no profile data) |
| Dev tooling | Claude Code with project skills, MongoDB MCP server (dev DB) |

## Where details live

| Topic | Doc |
| --- | --- |
| Pages, components, styling, i18n | `frontend.md` |
| Server structure, middleware, jobs | `backend.md` |
| Every endpoint and response shape | `api.md` |
| Collections, fields, indexes, MongoDB MCP | `database.md` |
| How matching works | `eligibility-engine.md` |
| Scheme JSON format and data workflow | `scheme-data.md` |
| Privacy, security, trust | `security.md` |
| Test plan | `testing.md` |
| Env vars, hosting, CI | `deployment.md` |
| Phases and ready-to-paste prompts | `build-plan.md` |
| Decisions and why | `decisions.md` |
