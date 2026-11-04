# API

Base path `/api/v1`, same origin as the site. JSON in and out. Session = httpOnly cookie `fundora_session`. Shapes are Zod schemas in `src/shared/schemas`; the client already calls these paths (`src/client/lib/api.ts`, `features/*/api.ts`).

Errors always look like `{ "error": { "code": "VALIDATION_FAILED", "message": "…", "fields": { "email": "Invalid email" } } }`.

## Endpoints

| Method | Path | Auth | Body / query | Returns |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | public | `{ email, password, consent: true }` | 201 `{ user }` + cookie (logged in, unverified), sends verification email; 409 `EMAIL_TAKEN` |
| POST | `/auth/verify` | public | `{ token }` | 200 `{ user }` |
| POST | `/auth/resend-verification` | student | — | 204 |
| POST | `/auth/login` | public | `{ email, password }` | 200 `{ user }` + cookie |
| POST | `/auth/google` | public | `{ idToken }` | 200 `{ user }` + cookie |
| POST | `/auth/logout` | student | — | 204, clears cookie |
| POST | `/auth/forgot` | public | `{ email }` | 200 always |
| POST | `/auth/reset` | public | `{ token, password }` | 204 |
| GET | `/me` | student | — | `{ user: { id, email, verified }, profileComplete: number }` |
| GET | `/profile` | student | — | `Profile` (decrypted, own only); `{ profileVersion: 0 }` before the first save |
| PUT | `/profile` | student | partial `Profile`: a missing field is unchanged, `null` clears it, `docs` flags merge; unknown keys are a 400 | `Profile`; bumps `profileVersion` |
| GET | `/schemes` | public* | `?q=&aidType=&providerType=&group=&state=&openOnly=&sort=` | `Scheme[]`, each with `match` when logged in, else `match.state = "unknown"` |
| GET | `/schemes/:id` | public* | — | `Scheme` with `eligibility[]` (rule text + met/notMet/unknown) when logged in |
| GET | `/saved` | student | — | `SavedScheme[]` |
| POST | `/saved` | student | `{ schemeId }` | 201 `SavedScheme` (stage `saved`); creates reminder notifications |
| PATCH | `/saved/:schemeId` | student | `{ stage: "saved" \| "applied" \| "renewal_due", notes? }` | `SavedScheme` |
| DELETE | `/saved/:schemeId` | student | — | 204; removes its pending notifications |
| GET | `/notifications/settings` | student | — | `{ deadlineEmails: boolean, renewalEmails: boolean }` |
| PATCH | `/notifications/settings` | student | same | same |
| POST | `/schemes/:id/report` | student | `{ field, message }` | 201; emails the team |
| GET | `/account/export` | student | — | JSON file: user, profile, saved, notifications |
| DELETE | `/account` | student | `{ password }` (or recent Google login) | 204; deletes user + all linked documents |
| GET | `/health` | public | — | `{ ok: true, db: "up" }` for uptime checks; 503 `{ ok: false, db: "down" }` |

\* Works logged out; adds personal match data when the session cookie is present.

There are **no** write routes for schemes and **no** admin or role-based routes.

## Shapes

`Scheme` = everything in the scheme JSON file (see `scheme-data.md`) **minus** `rules`, plus computed fields:
- `isOpen` (from `opensOn`/`closesOn` and today in IST)
- `match: { state: "eligible" | "almost" | "not" | "unknown", reason: string, score: number }`
- `eligibility?: { rule: string, result: "met" | "notMet" | "unknown" }[]` on the detail route
- `popularity` (rank by saves in the last 30 days)

Raw `rules` stay server-side so the client can't drift from the engine, but the reasons explain each one.

`SavedScheme` = `{ schemeId, stage, savedOn, appliedOn?, notes? }`.

## Conventions

- Status codes: 200 OK, 201 created, 204 no body, 400 validation, 401 not logged in, 403 action not allowed (for example, deleting with a wrong password), 404 not found (also used for another student's resources, so existence isn't leaked), 409 conflict (email taken, already saved), 413 body over 100 kb, 415 non-JSON body on a state-changing request, 429 rate limited, 500 server.
- Auth error codes: `VALIDATION_FAILED` (with `fields`), `INVALID_JSON`, `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `INVALID_TOKEN` (verification/reset link invalid, used or expired), `RATE_LIMITED`.
- Dates are `YYYY-MM-DD` strings; timestamps are ISO 8601 UTC.
- Lists are returned whole in v1 (a few hundred schemes). Add `?page=&limit=` when a list passes 500 items.
- Analytics events (PostHog) are sent from the client and never include profile fields.
