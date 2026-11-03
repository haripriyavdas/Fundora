# src/server — Express API

Serves `/api/v1/*` and, in production, the built React app. Full guide: `docs/backend.md`. Routes: `docs/api.md`. Skill: `api-route`.

## Layout

```
src/server/
├── index.ts               ← starts the server, connects MongoDB, starts jobs
├── app.ts                 ← builds the Express app (exported for Supertest)
├── vite.ts                ← dev: Vite middleware · prod: serve dist/client + SPA fallback
├── config/env.ts          ← reads and validates env vars with Zod (fail fast)
├── db/connect.ts          ← Mongoose connection
├── models/                ← User, Profile, Scheme, Application, MatchResult, Notification, Report
├── routes/                ← auth, profile, schemes, saved, notifications, reports, account
├── middleware/            ← requireAuth, validate(zodSchema), rateLimit, errorHandler
├── services/              ← matching, email, crypto (field encryption), tokens
└── jobs/                  ← reminders (daily), linkCheck (weekly)
```

## Rules

- **Imports from shared use relative paths** (`../../shared/schemas`), not `@shared`. Plain `tsc` doesn't rewrite aliases.
- **Every route:** validate the body, params and query with a Zod schema from `src/shared` using the `validate()` middleware. Student routes use `requireAuth`. Take the user id from `req.user.id` (the session), never from the body or URL.
- **No roles.** `requireAuth` is the only access check. Don't add `requireRole`, admin routes or a `role` field.
- **Schemes are read-only.** No POST/PUT/DELETE for schemes. Only `scripts/seed.ts` writes the `schemes` collection.
- **Matching:** call `evaluate()` from `src/shared/eligibility`. Never reimplement rule logic in a route or service.
- **Sensitive fields** (`familyIncome`, `category`, `disability`) are encrypted with `services/crypto.ts` (AES-256-GCM) before save and decrypted only to run matching or return the student's own profile. Never log them; the logger redacts them.
- **Errors:** throw `HttpError(status, code)`; `errorHandler` sends `{ error: { code, message } }`. Never send stack traces or Mongo errors to the client.
- **Responses** match the shapes in `src/shared/schemas` exactly, because the client relies on them.
- **Tests:** each route gets Supertest tests in `src/server/routes/*.test.ts`: success, validation error (400), logged out (401), and another student's data not reachable.
- **Env vars:** add new ones to `config/env.ts`, `.env.example` and `docs/deployment.md` together.
