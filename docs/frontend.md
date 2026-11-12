# Frontend

The React app in `frontend-fundora-starter`, built by Vite into `dist/client` and served by Express. It was written fresh here in Phase 0 (see `decisions.md`).

## Pages

| Route | Page | Auth | Status |
| --- | --- | --- | --- |
| `/` | Landing (hero, how it works, match states, safety) | public | built (basic) |
| `/login`, `/signup` | Email + password, consent checkbox (Google button: Phase 1b) | public | built (live API) |
| `/forgot`, `/reset-password` | Password reset | public | built (live API) |
| `/verify-email` | Confirms the emailed token | public | built (live API) |
| `/profile` | 5-step wizard: education → marks & attendance → family & income → category & background → documents held | student | built (live API) |
| `/dashboard` | Profile completeness, counts per match state, upcoming deadlines | student | "Eligible for" and "Closing in 14 days" from `GET /schemes`; "Saved to apply" and "Offline visits needed" from `GET /saved`; profile card; up to 3 saved schemes plus a "Save a scheme" tile |
| `/matches` | Tabs Eligible / Almost / Not eligible, filters (type, amount, deadline, provider, group), sort | student | built: tabs Eligible / Almost / Not eligible / Need info with counts, filters (type, provider, group, open only) and sort in the URL, profile nudge |
| `/browse` | All schemes, search, filters; no account needed | public | built: search on submit, filters incl. state, sort in the URL; student shell when signed in, site shell otherwise (`OpenLayout`) |
| `/schemes/:schemeId` | Full scheme page with match reasons and Apply button | public | built: red hero + fact strip, rule-by-rule eligibility (signed in), documents, steps, offline, dates, help, stale notice after 90 days, sticky Apply with the no-fee/no-password note |
| `/applications` | Tracker: Saved · Applied · Renewal due | student | three columns (stacked on phones); each card has a stage menu, official portal link and remove; "Email reminders" settings card. Data from `features/applications/store.ts` |
| `/account` | Reminder settings, export data, delete account | student | to build |
| `/guides`, `/guides/:slug` | Markdown guides from `content/guides` | public | to build |
| `/privacy`, `/terms` | Static | public | placeholder |

## Structure and data flow

- `features/<area>/api.ts`: functions that call `lib/api.ts` and return typed data (types from `@shared`).
- `features/<area>/store.ts` or `use<Thing>.ts`: small `useSyncExternalStore` stores or hooks that load once and expose state. TanStack Query can replace these later if caching gets complex; don't mix both in one feature.
- Pages compose components and hooks; no fetch logic in pages.
- `VITE_USE_MOCK_DATA` (default on) keeps mock data until a route is live. Turn it off feature by feature.

## Profile wizard

Fields map 1:1 to `ProfileSchema` in `src/shared/schemas/profile.ts`. Rules:
- Save after each step (`PUT /api/v1/profile` with a partial body); the student can leave and resume.
- Explain why sensitive fields are asked ("Used only to match schemes. Encrypted. Never shared.").
- Every field is optional to save, but matching shows `unknown` for schemes whose hard rules need a missing field, with a "Complete your profile" link.
- Documents step = yes/no checklist (income certificate, caste certificate, disability certificate, Aadhaar-seeded bank account…). Never ask for numbers.
- Steps are data in `features/profile/steps.ts`; `steps.test.ts` fails if a profile field isn't asked or has no label. Current-aid questions sit in the family & income step.
- Built with `react-hook-form` and `@hookform/resolvers`, lazy-loaded with the page. The step is in the URL (`?step=2`), so refresh and the back button work. "Back" keeps unsaved typing but doesn't save it.
- Blank inputs become `null`, so emptying a field really clears it. Number inputs are text inputs with a number keyboard, which accept `2,50,000`.

## Design system

Tokens live in `frontend-fundora-starter/index.css` under `@theme`:

| Token | Use |
| --- | --- |
| `brand`, `brand-strong`, `brand-soft` | red (`#D1352B`): primary actions, active nav, urgency, hero cards only |
| `accent`, `accent-strong`, `on-accent`, `on-accent-muted` | charcoal sidebar, ink buttons, selected pills, and the cream text on them |
| `ink`, `body`, `muted` | headings, body text, meta and eyebrows |
| `surface`, `surface-2`, `tile` | cream canvas, panel/footer tint, beige icon tiles and mode chips |
| `line`, `line-soft`, `line-strong` | card borders, dividers inside cards, secondary-button and dashed borders |
| `eligible(-bg)`, `almost(-bg)`, `not(-bg)`, `info(-bg)`, `warn(-bg)` | match states, notices, warning banners |

Look: cream canvas, charcoal sidebar (300 px, collapses to a top bar + bottom nav below `lg`), flat red hero cards, no gradients, emoji or illustrations, thin stroke icons. Font: Inter Variable; display headings `font-extrabold` with `tracking-[-0.02em]`; eyebrows are 12 px caps with `tracking-[0.14em]` (`components/ui/Eyebrow.tsx`, with `PageHeader`). Corners: `rounded-2xl` cards, `rounded-full` buttons and chips, `rounded-[20px]` hero panels. Buttons: `button.primary` (red), `secondary` (white + border), `ink` (charcoal), `ghost`, `onBrand` (white pill on red). Building blocks in `components/app`: `StatTile`, `EmptyTile`, `SchemeCard` (+ skeleton), `SchemeList` (loading / error / empty), `MatchChip` and `ModeChip`, `FilterBar`. Animations: `animate-fade-up`, `animate-pop`, `animate-shake` (form errors). Match states always show icon + word + colour.

## i18n

`react-i18next`, one JSON per language in `frontend-fundora-starter/i18n/locales/`. English now; Kannada (`kn.json`) and Hindi (`hi.json`) later. Keys are grouped by page (`home.*`, `signup.*`, `scheme.*`). Scheme content from the database is English-only in v1.

## Performance budget

- Initial JS under 200 KB gzipped; lazy-load `pages/app/*` and `pages/auth/*`.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95.
- Test on a throttled "Slow 4G" profile and a 360 px viewport.
