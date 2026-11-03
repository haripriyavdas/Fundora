# Backend

The Express server in `src/server`. One process serves the API, the React app and the scheduled jobs.

## Startup

`src/server/index.ts`:
1. `config/env.ts` parses `process.env` with Zod and exits with a clear message if anything required is missing.
2. Connect Mongoose (`db/connect.ts`), ensure indexes.
3. `app.ts` builds the app: `helmet()` → `express.json({ limit: '100kb' })` → `cookie-parser` → request logger (redacts sensitive fields) → `/api/v1` routers → `vite.ts` (dev middleware or static `dist/client` + SPA fallback) → `errorHandler`.
4. Start node-cron jobs (skipped when `NODE_ENV=test`).
5. Listen on `PORT` (default 3000).

`app.ts` exports the app without listening, so Supertest can import it.

## Dev server with Vite

`vite.ts` in development:
```ts
const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' })
app.use(vite.middlewares)
```
In production: `express.static('dist/client')` and send `index.html` for any non-`/api` GET.

## Middleware

| Middleware | Does |
| --- | --- |
| `requireAuth` | Reads the JWT from the `fundora_session` cookie, verifies it, sets `req.user = { id }`. 401 if missing or invalid. |
| `validate({ body?, params?, query? })` | Parses with Zod schemas from `src/shared`; 400 with field errors on failure. |
| `rateLimit` | express-rate-limit: auth routes 10/min/IP, report route 5/hour/user, everything else 100/min/IP. |
| `requireJson` | 415 for a state-changing request whose body isn't `application/json` (blocks cross-site form posts). |
| `errorHandler` | Maps `HttpError` and Zod errors to `{ error: { code, message, fields? } }`; logs others to Sentry; generic 500. |

## Services

| Service | Does |
| --- | --- |
| `matching.ts` | Loads schemes, decrypts profile, calls `evaluate()`, reads and writes the `matchResults` cache |
| `crypto.ts` | `encrypt(value)` / `decrypt(blob)`, AES-256-GCM, key from `FIELD_ENCRYPTION_KEY` (32 bytes, base64), random 12-byte IV per value, stores `iv:tag:ciphertext` |
| `auth.ts` | Register, verify, resend, login, forgot and reset logic used by `routes/auth.ts` |
| `tokens.ts` | Signs and verifies session JWTs; creates hashed single-use tokens for email verification and password reset |
| `email.ts` | Sends verification, reset, reminder, report-received and broken-link emails through Resend/Brevo; templates in `services/email-templates/` |

## Jobs

| Job | When (IST) | Does |
| --- | --- | --- |
| `reminders` | daily 08:00 | Sends due notifications (14, 7, 1 days before `closesOn` for saved schemes; renewal reminders), marks `sentAt` |
| `linkCheck` | Monday 03:00 | HEAD/GET every active `portal.url` and `sourceUrl`; emails the team a list of failures |

Jobs must be safe to run twice (check `sentAt` before sending). On Render's free tier the instance sleeps, so the jobs only run while it's awake; move to a paid instance or a Render Cron Job before launch.

## Auth flows

- **Register:** validate → bcrypt hash (cost 12) → create user (`verified: false`, `consentAt`) → email a verification link (token valid 24 h).
- **Login:** verify password → set cookie `fundora_session` (JWT `{ sub: userId }`, 7 days, httpOnly, Secure in prod, SameSite=Lax).
- **Google (optional):** client gets a Google ID token → `POST /auth/google` → verify with google-auth-library (audience = `GOOGLE_CLIENT_ID`) → find or create the user by email (`verified: true`) → set the cookie.
- **Reset:** `POST /auth/forgot` always returns 200 (doesn't reveal whether an email exists) → emailed token valid 1 h → `POST /auth/reset`.
- Unverified users can log in and build a profile but get a banner; reminder emails are only sent to verified users.

## Logging

pino with `redact: ['*.familyIncome', '*.category', '*.disability', '*.password', 'req.headers.cookie']`. Never `console.log` a profile.
