# Build plan

Ten phases, about 12 weeks part-time for a small team. Each phase has a **prompt to paste into Claude Code** from the project root. Do one phase (or one numbered step) per session, review the diff, run the checks, commit, then move on.

Tick phases off here as you finish them.

---

## Phase 0 — One-folder setup (week 1)

- [x] Root `package.json`, TypeScript configs, Vite config, Express dev server with Vite middleware
- [x] Frontend in `src/client` (written fresh; see the checklist below)
- [x] Lint, format, Husky, CI

> **Prompt:**
> Read CLAUDE.md, docs/architecture.md, docs/frontend.md and docs/backend.md. Set up Phase 0: one folder, one package.json, no nested projects.
> 1. Move the React app from the `Fundora-frontend/` folder in this repo into `src/client` with `git mv` so history is kept. Move its `index.html` and `public/` to the root, merge its dependencies into the root package.json, then remove `Fundora-frontend/` (including its node_modules, dist, dist-single and _backup-* folders). Move the old `FUNDORA_ARCHITECTURE.md` to `docs/archive/`. Update the Vite config so the root is the project folder, the entry is `src/client/main.tsx`, the build goes to `dist/client`, and the aliases are `@` → src/client and `@shared` → src/shared.
> 2. Create `tsconfig.json` (client + shared, bundler resolution) and `tsconfig.server.json` (server + shared + scripts, NodeNext, outDir dist).
> 3. Install the backend dependencies: express, mongoose, zod, helmet, cookie-parser, express-rate-limit, bcrypt, jsonwebtoken, pino, node-cron, google-auth-library, and dev deps tsx, vitest, supertest, mongodb-memory-server, @playwright/test, husky, lint-staged and the needed @types.
> 4. Create `src/server/index.ts`, `app.ts`, `vite.ts`, `config/env.ts` and a `GET /api/v1/health` route, so `npm run dev` serves the React app and the API on port 3000.
> 5. Fill in the scripts in package.json to match CLAUDE.md. Set up ESLint and Prettier for the whole repo and Husky + lint-staged.
> Run lint, typecheck and build, and show me that `/` and `/api/v1/health` both work.

### Phase 0 — implementation checklist (2026-11-03)

There was no `Fundora-frontend/` folder in this repo, so the client was written fresh in `src/client` instead of moved (step 1 above doesn't apply).

- [x] `git init`; root `package.json` with every runtime + dev dependency
- [x] `tsconfig.json` (client + shared, bundler) and `tsconfig.server.json` (server + shared, NodeNext → `dist/`)
- [x] `vite.config.ts` (root = project, entry `src/client/main.tsx`, out `dist/client`, aliases `@`, `@shared`), `vitest.config.ts`
- [x] `src/server`: `index.ts`, `app.ts`, `vite.ts`, `config/env.ts`, `db/connect.ts`, logger with redaction, `HttpError`, `errorHandler`, `GET /api/v1/health`, JSON 404 for unknown `/api` paths
- [x] `src/client` skeleton: `index.html`, `main.tsx`, `App.tsx`, `index.css` design tokens, i18n, `lib/api.ts`, layout (Navbar, Footer, Logo), landing page
- [x] ESLint (flat, whole repo), Prettier, Husky + lint-staged
- [x] `lint`, `typecheck`, `test`, `build` pass; `/` and `/api/v1/health` respond

## Phase 1 — Auth (week 2)

### Phase 1 — implementation checklist (2026-11-03)

Shared
- [x] `src/shared/schemas/auth.ts`: register / login / verify / forgot / reset bodies, `PublicUser`, `MeResponse`; password ≥ 8 chars, ≤ 72 bytes (bcrypt limit), not on the common-password list

Server
- [x] `models/User.ts`: email (unique, lowercase), passwordHash?, googleId? (sparse unique), verified, consentAt, hashed one-time token fields. **No role.**
- [x] `services/tokens.ts`: session JWT sign/verify; random 32-byte one-time tokens stored as SHA-256
- [x] `services/email.ts` with transports `resend`, `brevo`, `console` (dev) and an in-memory stub (tests); templates for verification + reset carry the scam warning
- [x] Middleware: `requireAuth`, `validate`, rate limits (auth 10/min/IP, global 100/min/IP), JSON-only for state-changing requests
- [x] Routes: `POST /auth/register · verify · resend-verification · login · logout · forgot · reset`, `GET /me`
- [x] Supertest tests for every route: success, 400, 401, rate limit, token expiry/reuse, no `/api/v1/admin`

Client
- [x] `features/auth/api.ts` + session store; `AppLayout` guards logged-in pages and shows the "verify your email" banner
- [x] Pages: `/signup` (consent checkbox), `/login`, `/forgot`, `/reset-password`, `/verify-email`, `/dashboard` placeholder
- [x] All strings via i18n, mobile-first, labelled inputs with inline errors + `animate-shake`. Exception: field validation messages come from the shared Zod schemas in English; move them to i18n keys before adding Kannada/Hindi

Docs
- [x] `docs/database.md` (token fields), `docs/api.md`, `docs/deployment.md` + `.env.example` (`EMAIL_PROVIDER=console`), `docs/frontend.md` statuses

> **Prompt:**
> Use the api-route skill. Read docs/backend.md (Auth flows), docs/api.md and docs/security.md. Build auth: the User model (no role field), the shared Zod schemas in src/shared/schemas/auth.ts, the routes register / verify / resend-verification / login / logout / forgot / reset / me, the requireAuth middleware, the tokens service, and the email service with a stub transport for tests. Add rate limits. Write Supertest tests for every route. Then connect the existing login and signup pages in src/client to these routes (lib/api.ts already calls /auth/login and /auth/register) and add the verify-email and reset-password pages.

Optional 1b: *"Add Google sign-in: POST /auth/google verifying the ID token with google-auth-library, and wire src/client/lib/googleAuth.ts to Google Identity Services."*

- [x] 1b done (2026-11-11): `POST /auth/google` (verified Google emails only; links by `googleId`, then email; new accounts need consent), `services/google.ts`, Google button on `/login` and `/signup`, 13 Supertest tests with the Google check stubbed. Still to do by hand: sign in with a real Google account in the browser

## Phase 2 — Student profile (weeks 2–3)

### Phase 2 — implementation checklist (2026-11-04)

Shared
- [x] `constants.ts`, `schemas/profile.ts`: `ProfileSchema`, `ProfileUpdateBody` (strict; `null` clears a field), `PROFILE_FIELDS`
- [x] `profileCompleteness.ts`, used by `GET /me` and the wizard
- [x] `fieldApplies()` in `profileCompleteness.ts` (2026-11-09): not counted are the other-scholarship name after a No, disability % and certificate after a No, CGPA in year 1, and the caste certificate for General. Each still counts while the answer it depends on is blank

Server
- [x] `services/crypto.ts` (AES-256-GCM), `models/Profile.ts`, `services/profile.ts`, `GET`/`PUT /profile` with partial saves and a `profileVersion` bump
- [x] Tests that need no database: encryption, Mongo update building, model paths
- [x] `routes/profile.test.ts` runs and passes (27 tests, 2026-11-09)

Client
- [x] `/profile`: 5-step wizard with React Hook Form + Zod, saving after each step, all text through i18n
- [x] Component tests in `ProfilePage.test.tsx` (API mocked)
- [x] Checked `npm run dev` by hand at 360 px and on desktop, against a real database (2026-11-09)

> **Prompt:**
> Read docs/database.md (profiles) and docs/security.md. Create ProfileSchema and PROFILE_FIELDS in src/shared/schemas/profile.ts with every field listed in database.md, the Profile model, services/crypto.ts (AES-256-GCM for familyIncome, category, disability) and GET/PUT /api/v1/profile with partial saves and a profileVersion bump. Test that the stored values are encrypted. Then build the 5-step profile wizard at /profile in src/client with React Hook Form + Zod, saving after each step, all text through i18n, mobile-first, using the existing design tokens. Use the frontend-page skill.

## Phase 3 — Scheme data pipeline (weeks 3–5)

### Phase 3 — implementation checklist (2026-11-09)

Shared
- [x] `schemas/rule.ts`: `RuleSchema`, `RULE_OPERATORS`; each rule's value is checked against the profile field's type and options
- [x] `schemas/scheme.ts`: `SchemeFileSchema` (strict, https-only links, `offline` required for `onlineAndOffline`, `ALL` only on its own), value lists
- [x] `SchemeSchema` (API shape, no `rules`): done in Phase 4

Server
- [x] `models/Scheme.ts` with `status`, `dataVersion`, `contentHash`, `seededAt` and the indexes in `database.md`

Scripts
- [x] `validate-schemes`, `seed` (`--dry-run`, retire instead of delete, `dataVersion` bumped only on change), `import-sheet` (papaparse), shared code in `scripts/lib` with tests
- [x] `_example.json` passes; seed checked on `fundora_dev`: add → no change → update → retire
- [x] CI already runs `validate-schemes` and the seed job on push to `main`; it now passes with the empty folder
- [ ] Client Scheme type: there's no client scheme code yet; the scheme pages will use `@shared` types from the start

> **Prompt:**
> Read docs/scheme-data.md and data/schemes/CLAUDE.md. Create SchemeFileSchema and RuleSchema in src/shared/schemas, the Scheme model, and the scripts validate-schemes, seed (with --dry-run) and import-sheet. Make data/schemes/_example.json pass validation. Add validate-schemes to CI and a seed job on push to main (see docs/deployment.md). Replace the client's Scheme type in src/client/features/schemes/types.ts with types inferred from the shared schema, keeping the fields the UI already uses.

Then, for each scheme: *"Use the add-scheme skill to add <scheme name> from <official URL>."*

## Phase 4 — Eligibility engine (weeks 4–6)

### Phase 4 — implementation checklist (2026-11-12)

Shared
- [x] `eligibility/`: `evaluate` (pure, derived `age` and `isFinalYear`), `operators`, `reasons` + `labels` (Indian money grouping), `fixtures/profiles.ts` (made-up students)
- [x] Tests: every operator at pass / fail / on the limit / one over / in margin / past margin / missing; state rules; score; `_example.json` snapshots
- [x] `schemas/match.ts` (`MatchResultSchema`), `SchemeSchema` + `SchemesQuery`, `dates.ts` (`todayInIndia`, `isSchemeOpen`)

Scripts
- [x] `check-scheme`: validates a file and prints state, score and reason per sample student

Server
- [x] `models/MatchResult.ts` (encrypted results, keyed on profileVersion + dataVersion + day, TTL 30 days)
- [x] `services/matching.ts`, `readSession` middleware, `GET /schemes` (filters, sort) and `GET /schemes/:id` (eligibility) with Supertest tests

Client
- [x] Dashboard "Eligible for" and "Closing in 14 days" tiles use `GET /schemes` (`features/schemes`)
- [ ] Matches, browse and scheme pages: Phase 5 (there's no mock scheme data to switch off; pages call the API from the start)
- [ ] Real schemes in `data/schemes` (team, with the `add-scheme` skill), then `check-scheme` on 2–3 of them

> **Prompt:**
> Use the eligibility-engine skill. Implement src/shared/eligibility (evaluate, operators, reasons) exactly as docs/eligibility-engine.md describes, with fixtures and the full test list. Add scripts/check-scheme.ts. Then build services/matching.ts with the matchResults cache and make GET /api/v1/schemes and GET /api/v1/schemes/:id return match and eligibility data as docs/api.md describes. Turn VITE_USE_MOCK_DATA off for schemes and check that the dashboard, matches, browse and scheme pages work with real data.

## Phase 5 — Discovery UI polish (weeks 6–7)

> **Prompt:**
> Use the frontend-page skill. Make /matches and /browse use real filters and sort (aidType, providerType, group, amount, closing date, open only) synced to the URL query. On the scheme page, show the eligibility reasons, the "verify on the official site" note, the stale-data notice when verifiedOn is over 90 days old, and the Apply button opening portal.url in a new tab. Add loading, empty and error states. Check at 360 px wide.

## Phase 6 — Tracker and reminders (weeks 7–8)

> **Prompt:**
> Read docs/api.md (saved routes) and docs/backend.md (Jobs). Build the Application model (stages saved | applied | renewal_due only), the /saved routes, notification creation on save (14, 7 and 1 days before closesOn), the daily reminders job, renewal reminders, and the notification settings routes with tests. Then update src/client/features/applications/store.ts to call the API, and make /applications a three-column tracker (Saved, Applied, Renewal due), with a stage menu on each card on mobile.

## Phase 7 — Trust and account (week 9)

> **Prompt:**
> Read docs/security.md (Trust). Add verified badges, the scam-warning banner, the report-wrong-info form + POST /schemes/:id/report (emails TEAM_INBOX), the weekly link-check job, and the /account page with GET /account/export and DELETE /account (password confirm, removes all linked data). Test that deletion leaves nothing behind.

## Phase 8 — Guides and content (week 10)

> **Prompt:**
> Render Markdown files from content/guides and content/stories at /guides and /guides/:slug (react-markdown, build-time import with import.meta.glob). Write first drafts of three guides: NSP registration, Aadhaar–bank seeding, and getting income and caste certificates in Karnataka. Mark facts I need to verify with TODO(verify). Add PostHog page views and the events listed in docs/api.md, with no profile data.

## Phase 9 — Testing and launch (weeks 11–12)

> **Prompt:**
> Read docs/testing.md and docs/deployment.md. Write the Playwright main-path test with axe checks on a mobile profile. Run Lighthouse on the main pages and fix anything under the budget in docs/frontend.md. Then run the security-review skill over the whole codebase and give me the deployment checklist with what's still missing.

Then: pilot with 30–50 BMSCE students, fix wrong matches, launch.

## Phase 10 — v2: internships

Start a new design doc first (`docs/internships.md`): an `opportunities` type that reuses the rule engine with skill and year rules, profile additions (skills, projects, competitions, aspirations), a resume builder (PDF export), and listings for virtual internships, summer programs, NGO/research projects, open-source programs and campus ambassador roles.
